import { type FormEvent, useState } from "react";
import { guardarFormulario } from "../../api/cliente";
import { ErrorApi, type Errores } from "../../api/http";
import type { Catalogos, Ramo, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { Campo, Casilla, Opciones, SI_NO, Selector } from "../../components/Campo";
import { Pasos } from "../../components/Pasos";
import { aNumero, conMiles } from "../../format/formato";
import { useFocoEnError } from "./useFocoEnError";

type Valores = Record<string, string>;

const NUMERICOS: Record<Ramo, string[]> = {
  AUTOS: ["modelo"],
  SALUD: [],
  VIDA: ["edad", "valorAsegurado"],
  HOGAR: ["valorContenidos"],
  PYMES: ["ingresosAnuales", "numeroEmpleados"],
};
const MONEDA = new Set(["valorAsegurado", "valorContenidos", "ingresosAnuales", "ingresosMensuales", "egresosMensuales"]);
const SARLAFT_NUMERICOS = ["ingresosMensuales", "egresosMensuales"];

function aTexto(valor: unknown, campo: string): string {
  if (valor === undefined || valor === null) return "";
  if (typeof valor === "boolean") return valor ? "si" : "no";
  if (typeof valor === "number" && MONEDA.has(campo)) return conMiles(String(valor));
  return String(valor);
}

function inicial(datos: Record<string, unknown> | null): Valores {
  return Object.fromEntries(Object.entries(datos ?? {}).filter(([, v]) => !Array.isArray(v)).map(([k, v]) => [k, aTexto(v, k)]));
}

const siNo = (v: string | undefined) => (v === "si" ? true : v === "no" ? false : undefined);

interface Props {
  solicitud: SolicitudVista;
  catalogos: Catalogos;
  onGuardada: (s: SolicitudVista) => void;
  onCancelar?: () => void;
}

export function PasoFormulario({ solicitud, catalogos, onGuardada, onCancelar }: Props) {
  const ramo = solicitud.ramo;
  const [datos, setDatos] = useState<Valores>(() => inicial(solicitud.datosRamo));
  const [edades, setEdades] = useState<string[]>(() =>
    Array.isArray(solicitud.datosRamo?.edades) ? (solicitud.datosRamo!.edades as number[]).map(String) : [""],
  );
  const [sarlaft, setSarlaft] = useState<Valores>(() => inicial(solicitud.sarlaft));
  const [declara, setDeclara] = useState(solicitud.sarlaft?.declaraOrigenLicito === true);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(0);
  useFocoEnError(errores, intento);

  const dato = (campo: string, moneda = false) => ({
    value: datos[campo] ?? "",
    onChange: (e: { target: { value: string } }) => setDatos((d) => ({ ...d, [campo]: moneda ? conMiles(e.target.value) : e.target.value })),
    error: errores[`datosRamo.${campo}`],
    id: `datosRamo.${campo}`,
  });
  const sar = (campo: string, moneda = false) => ({
    value: sarlaft[campo] ?? "",
    onChange: (e: { target: { value: string } }) => setSarlaft((d) => ({ ...d, [campo]: moneda ? conMiles(e.target.value) : e.target.value })),
    error: errores[`sarlaft.${campo}`],
    id: `sarlaft.${campo}`,
  });

  function construir() {
    const locales: Errores = {};
    const numero = (texto: string | undefined, clave: string) => {
      const n = aNumero(texto ?? "");
      if (Number.isNaN(n)) locales[clave] = "Escriba solo números";
      return n;
    };
    const datosRamo: Record<string, unknown> = { ...datos };
    for (const campo of NUMERICOS[ramo]) datosRamo[campo] = numero(datos[campo], `datosRamo.${campo}`);
    if (ramo === "SALUD") {
      datosRamo.edades = edades.map((e, i) => numero(e, `datosRamo.edades.${i}`));
      datosRamo.preexistencias = siNo(datos.preexistencias);
    }
    const sarlaftFinal: Record<string, unknown> = {
      ...sarlaft,
      personaExpuestaPoliticamente: siNo(sarlaft.personaExpuestaPoliticamente),
      declaraOrigenLicito: declara,
    };
    for (const campo of SARLAFT_NUMERICOS) sarlaftFinal[campo] = numero(sarlaft[campo], `sarlaft.${campo}`);
    return { cuerpo: { datosRamo, sarlaft: sarlaftFinal }, locales };
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const { cuerpo, locales } = construir();
    setMensaje("");
    if (Object.keys(locales).length > 0) {
      setErrores(locales);
      setMensaje("Revise los campos marcados.");
      setIntento((n) => n + 1);
      return;
    }
    setEnviando(true);
    try {
      onGuardada(await guardarFormulario(solicitud.token, cuerpo));
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      setMensaje(e.message);
      setIntento((n) => n + 1);
      setEnviando(false);
    }
  }

  const nombreRamo = catalogos.ramos.find((r) => r.codigo === ramo)?.nombre ?? ramo;

  return (
    <>
      <Pasos actual={2} />
      <h1>Datos del seguro: {nombreRamo}</h1>
      <p className="cliente__intro">
        Estos datos se envían a todas las aseguradoras que cotizan {nombreRamo.toLowerCase()}. Solo tiene que escribirlos una vez.
      </p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      <form onSubmit={enviar} noValidate>
        <fieldset className="seccion-formulario">
          <legend>{ramo === "PYMES" ? "Datos de la empresa" : ramo === "HOGAR" ? "Datos del inmueble" : ramo === "AUTOS" ? "Datos del vehículo" : "Datos de los asegurados"}</legend>

          {ramo === "AUTOS" ? (
            <>
              <div className="fila-campos">
                <Campo etiqueta="Placa" ayuda="Tres letras y tres números, por ejemplo ABC123" autoCapitalize="characters" maxLength={7} {...dato("placa")} />
                <Campo etiqueta="Año del modelo" inputMode="numeric" maxLength={4} {...dato("modelo")} />
              </div>
              <div className="fila-campos">
                <Selector etiqueta="Ciudad de circulación" opciones={catalogos.ciudades} {...dato("ciudad")} />
                <Selector etiqueta="Uso del vehículo" opciones={catalogos.usosVehiculo} {...dato("uso")} />
              </div>
            </>
          ) : null}

          {ramo === "SALUD" ? (
            <>
              <div className="edades" role="group" aria-labelledby="edades-titulo">
                <p id="edades-titulo"><strong>Edades de las personas que quiere asegurar</strong></p>
                {errores["datosRamo.edades"] ? <p className="campo__error" id="datosRamo.edades" tabIndex={-1}>{errores["datosRamo.edades"]}</p> : null}
                {edades.map((edad, i) => (
                  <div className="edades__fila" key={i}>
                    <Campo id={`datosRamo.edades.${i}`} etiqueta={`Persona ${i + 1}`} inputMode="numeric" maxLength={3} value={edad}
                      onChange={(e) => setEdades((l) => l.map((x, j) => (j === i ? e.target.value : x)))} error={errores[`datosRamo.edades.${i}`]} />
                    {edades.length > 1 ? (
                      <Boton variante="enlace" onClick={() => setEdades((l) => l.filter((_, j) => j !== i))} aria-label={`Quitar persona ${i + 1}`}>Quitar</Boton>
                    ) : null}
                  </div>
                ))}
                {edades.length < 8 ? <Boton onClick={() => setEdades((l) => [...l, ""])}>Agregar persona</Boton> : null}
              </div>
              <Opciones id="datosRamo.preexistencias" etiqueta="¿Alguna persona tiene preexistencias?"
                ayuda="Enfermedades o condiciones médicas diagnosticadas antes de tomar el seguro."
                valor={datos.preexistencias ?? ""} opciones={SI_NO} error={errores["datosRamo.preexistencias"]}
                onCambiar={(v) => setDatos((d) => ({ ...d, preexistencias: v }))} />
            </>
          ) : null}

          {ramo === "VIDA" ? (
            <>
              <div className="fila-campos">
                <Campo etiqueta="Edad del asegurado" inputMode="numeric" maxLength={2} {...dato("edad")} />
                <Selector etiqueta="Ocupación" opciones={catalogos.ocupaciones} {...dato("ocupacion")} />
              </div>
              <Campo etiqueta="Valor asegurado" ayuda="En pesos. Es lo que recibirían sus beneficiarios." inputMode="numeric" {...dato("valorAsegurado", true)} />
            </>
          ) : null}

          {ramo === "HOGAR" ? (
            <>
              <Campo etiqueta="Dirección del inmueble" ayuda="Incluya la ciudad, por ejemplo Calle 85 # 15-20, Bogotá" autoComplete="street-address" ancho {...dato("direccion")} />
              <div className="fila-campos">
                <Selector etiqueta="Tipo de inmueble" opciones={catalogos.tiposInmueble} {...dato("tipoInmueble")} />
                <Campo etiqueta="Valor de los contenidos" ayuda="Muebles, electrodomésticos y objetos, en pesos" inputMode="numeric" {...dato("valorContenidos", true)} />
              </div>
            </>
          ) : null}

          {ramo === "PYMES" ? (
            <>
              <div className="fila-campos">
                <Campo etiqueta="NIT" ayuda="Con dígito de verificación, por ejemplo 900123456-8" {...dato("nit")} />
                <Selector etiqueta="Actividad económica" opciones={catalogos.actividades} {...dato("actividad")} />
              </div>
              <div className="fila-campos">
                <Campo etiqueta="Ingresos anuales" ayuda="En pesos" inputMode="numeric" {...dato("ingresosAnuales", true)} />
                <Campo etiqueta="Número de empleados" inputMode="numeric" maxLength={4} {...dato("numeroEmpleados")} />
              </div>
            </>
          ) : null}
        </fieldset>

        <fieldset className="seccion-formulario">
          <legend>Conocimiento del cliente (SARLAFT)</legend>
          <p className="cliente__intro texto-secundario">
            Las aseguradoras están obligadas a conocer a sus clientes. Este formulario se diligencia una sola vez y se comparte con todas.
          </p>
          <Campo etiqueta="Ocupación o actividad económica" ancho {...sar("ocupacion")} />
          <div className="fila-campos">
            <Campo etiqueta="Ingresos mensuales" ayuda="En pesos" inputMode="numeric" {...sar("ingresosMensuales", true)} />
            <Campo etiqueta="Egresos mensuales" ayuda="En pesos" inputMode="numeric" {...sar("egresosMensuales", true)} />
          </div>
          <Campo etiqueta="Origen de los fondos" ayuda="Por ejemplo: salario, honorarios, actividad comercial" ancho {...sar("origenFondos")} />
          <Opciones id="sarlaft.personaExpuestaPoliticamente" etiqueta="¿Es persona expuesta políticamente (PEP)?"
            ayuda="Quien ejerce o ejerció en los últimos dos años un cargo público de alto nivel, o es familiar cercano de esa persona."
            valor={sarlaft.personaExpuestaPoliticamente ?? ""} opciones={SI_NO} error={errores["sarlaft.personaExpuestaPoliticamente"]}
            onCambiar={(v) => setSarlaft((d) => ({ ...d, personaExpuestaPoliticamente: v }))} />
          <Casilla id="sarlaft.declaraOrigenLicito" marcada={declara} onCambiar={setDeclara} error={errores["sarlaft.declaraOrigenLicito"]}>
            Declaro que mis recursos provienen de actividades lícitas.
          </Casilla>
        </fieldset>

        <div className="acciones">
          <Boton type="submit" variante="principal" disabled={enviando}>{enviando ? "Cotizando…" : "Cotizar"}</Boton>
          {onCancelar ? <Boton onClick={onCancelar}>Volver al comparativo</Boton> : null}
        </div>
      </form>
    </>
  );
}
