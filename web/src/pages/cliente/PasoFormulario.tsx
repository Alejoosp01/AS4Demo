import { type FormEvent, useState } from "react";
import { guardarBorrador, guardarFormulario } from "../../api/cliente";
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
  const nueva = solicitud.estado === "NUEVA";
  // Si el cliente ya había guardado datos, se retoman desde el borrador.
  const datosIniciales = solicitud.datosRamo ?? solicitud.borrador?.datosRamo ?? null;
  const sarlaftInicial = solicitud.sarlaft ?? solicitud.borrador?.sarlaft ?? null;
  const [datos, setDatos] = useState<Valores>(() => inicial(datosIniciales));
  const [edades, setEdades] = useState<string[]>(() =>
    Array.isArray(datosIniciales?.edades) ? (datosIniciales!.edades as number[]).map(String) : [""],
  );
  const [sarlaft, setSarlaft] = useState<Valores>(() => inicial(sarlaftInicial));
  const [declara, setDeclara] = useState(sarlaftInicial?.declaraOrigenLicito === true);
  // Al volver por el enlace con datos guardados, solo se piden los campos pendientes.
  const [faltantes] = useState(() => new Set(solicitud.pendientes.map((p) => p.campo)));
  const [soloPendientes, setSoloPendientes] = useState(() => nueva && solicitud.borrador !== null && solicitud.pendientes.length > 0);
  const [guardado, setGuardado] = useState("");
  const ver = (campo: string) => !soloPendientes || faltantes.has(campo);
  const verAlguno = (prefijo: string) => !soloPendientes || [...faltantes].some((c) => c.startsWith(prefijo));
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
    setGuardado("");
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
      // Lo que sí quedó bien se conserva: al volver, el cliente solo verá lo que falta.
      if (nueva && e.status === 400) guardarBorrador(solicitud.token, cuerpo).catch(() => undefined);
    }
  }

  async function guardarParaDespues() {
    setMensaje("");
    setErrores({});
    try {
      await guardarBorrador(solicitud.token, construir().cuerpo);
      setGuardado("Guardamos sus datos. Puede cerrar esta página y volver con este mismo enlace: solo le pediremos lo que falte.");
    } catch (error) {
      setMensaje((error as ErrorApi).message);
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
      {soloPendientes ? (
        <Aviso>
          <p>
            Ya tenemos el resto de sus datos. Para cotizar solo {faltantes.size === 1 ? "falta este campo" : `faltan estos ${faltantes.size} campos`}.
          </p>
          <p><Boton variante="enlace" onClick={() => setSoloPendientes(false)}>Ver y corregir todos mis datos</Boton></p>
        </Aviso>
      ) : null}
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      {guardado ? <div role="status"><Aviso><p>{guardado}</p></Aviso></div> : null}
      <form onSubmit={enviar} noValidate>
        {verAlguno("datosRamo.") ? (
        <fieldset className="seccion-formulario">
          <legend>{ramo === "PYMES" ? "Datos de la empresa" : ramo === "HOGAR" ? "Datos del inmueble" : ramo === "AUTOS" ? "Datos del vehículo" : "Datos de los asegurados"}</legend>

          {ramo === "AUTOS" ? (
            <>
              <div className="fila-campos">
                {ver("datosRamo.placa") ? <Campo etiqueta="Placa" ayuda="Tres letras y tres números, por ejemplo ABC123" autoCapitalize="characters" maxLength={7} {...dato("placa")} /> : null}
                {ver("datosRamo.modelo") ? <Campo etiqueta="Año del modelo" inputMode="numeric" maxLength={4} {...dato("modelo")} /> : null}
              </div>
              <div className="fila-campos">
                {ver("datosRamo.ciudad") ? <Selector etiqueta="Ciudad de circulación" opciones={catalogos.ciudades} {...dato("ciudad")} /> : null}
                {ver("datosRamo.uso") ? <Selector etiqueta="Uso del vehículo" opciones={catalogos.usosVehiculo} {...dato("uso")} /> : null}
              </div>
            </>
          ) : null}

          {ramo === "SALUD" ? (
            <>
              {ver("datosRamo.edades") ? <div className="edades" role="group" aria-labelledby="edades-titulo">
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
              </div> : null}
              {ver("datosRamo.preexistencias") ? <Opciones id="datosRamo.preexistencias" etiqueta="¿Alguna persona tiene preexistencias?"
                ayuda="Enfermedades o condiciones médicas diagnosticadas antes de tomar el seguro."
                valor={datos.preexistencias ?? ""} opciones={SI_NO} error={errores["datosRamo.preexistencias"]}
                onCambiar={(v) => setDatos((d) => ({ ...d, preexistencias: v }))} /> : null}
            </>
          ) : null}

          {ramo === "VIDA" ? (
            <>
              <div className="fila-campos">
                {ver("datosRamo.edad") ? <Campo etiqueta="Edad del asegurado" inputMode="numeric" maxLength={2} {...dato("edad")} /> : null}
                {ver("datosRamo.ocupacion") ? <Selector etiqueta="Ocupación" opciones={catalogos.ocupaciones} {...dato("ocupacion")} /> : null}
              </div>
              {ver("datosRamo.valorAsegurado") ? <Campo etiqueta="Valor asegurado" ayuda="En pesos. Es lo que recibirían sus beneficiarios." inputMode="numeric" {...dato("valorAsegurado", true)} /> : null}
            </>
          ) : null}

          {ramo === "HOGAR" ? (
            <>
              {ver("datosRamo.direccion") ? <Campo etiqueta="Dirección del inmueble" ayuda="Incluya la ciudad, por ejemplo Calle 85 # 15-20, Bogotá" autoComplete="street-address" ancho {...dato("direccion")} /> : null}
              <div className="fila-campos">
                {ver("datosRamo.tipoInmueble") ? <Selector etiqueta="Tipo de inmueble" opciones={catalogos.tiposInmueble} {...dato("tipoInmueble")} /> : null}
                {ver("datosRamo.valorContenidos") ? <Campo etiqueta="Valor de los contenidos" ayuda="Muebles, electrodomésticos y objetos, en pesos" inputMode="numeric" {...dato("valorContenidos", true)} /> : null}
              </div>
            </>
          ) : null}

          {ramo === "PYMES" ? (
            <>
              <div className="fila-campos">
                {ver("datosRamo.nit") ? <Campo etiqueta="NIT" ayuda="Con dígito de verificación, por ejemplo 900123456-8" {...dato("nit")} /> : null}
                {ver("datosRamo.actividad") ? <Selector etiqueta="Actividad económica" opciones={catalogos.actividades} {...dato("actividad")} /> : null}
              </div>
              <div className="fila-campos">
                {ver("datosRamo.ingresosAnuales") ? <Campo etiqueta="Ingresos anuales" ayuda="En pesos" inputMode="numeric" {...dato("ingresosAnuales", true)} /> : null}
                {ver("datosRamo.numeroEmpleados") ? <Campo etiqueta="Número de empleados" inputMode="numeric" maxLength={4} {...dato("numeroEmpleados")} /> : null}
              </div>
            </>
          ) : null}
        </fieldset>
        ) : null}

        {verAlguno("sarlaft.") ? (
        <fieldset className="seccion-formulario">
          <legend>Conocimiento del cliente (SARLAFT)</legend>
          <p className="cliente__intro texto-secundario">
            Las aseguradoras están obligadas a conocer a sus clientes. Este formulario se diligencia una sola vez y se comparte con todas.
          </p>
          {ver("sarlaft.ocupacion") ? <Campo etiqueta="Ocupación o actividad económica" ancho {...sar("ocupacion")} /> : null}
          <div className="fila-campos">
            {ver("sarlaft.ingresosMensuales") ? <Campo etiqueta="Ingresos mensuales" ayuda="En pesos" inputMode="numeric" {...sar("ingresosMensuales", true)} /> : null}
            {ver("sarlaft.egresosMensuales") ? <Campo etiqueta="Egresos mensuales" ayuda="En pesos" inputMode="numeric" {...sar("egresosMensuales", true)} /> : null}
          </div>
          {ver("sarlaft.origenFondos") ? <Campo etiqueta="Origen de los fondos" ayuda="Por ejemplo: salario, honorarios, actividad comercial" ancho {...sar("origenFondos")} /> : null}
          {ver("sarlaft.personaExpuestaPoliticamente") ? <Opciones id="sarlaft.personaExpuestaPoliticamente" etiqueta="¿Es persona expuesta políticamente (PEP)?"
            ayuda="Quien ejerce o ejerció en los últimos dos años un cargo público de alto nivel, o es familiar cercano de esa persona."
            valor={sarlaft.personaExpuestaPoliticamente ?? ""} opciones={SI_NO} error={errores["sarlaft.personaExpuestaPoliticamente"]}
            onCambiar={(v) => setSarlaft((d) => ({ ...d, personaExpuestaPoliticamente: v }))} /> : null}
          {ver("sarlaft.declaraOrigenLicito") ? (<Casilla id="sarlaft.declaraOrigenLicito" marcada={declara} onCambiar={setDeclara} error={errores["sarlaft.declaraOrigenLicito"]}>
            Declaro que mis recursos provienen de actividades lícitas.
          </Casilla>) : null}
        </fieldset>
        ) : null}

        <div className="acciones">
          <Boton type="submit" variante="principal" disabled={enviando}>{enviando ? "Cotizando…" : "Cotizar"}</Boton>
          {nueva ? <Boton onClick={guardarParaDespues}>Guardar y continuar después</Boton> : null}
          {onCancelar ? <Boton onClick={onCancelar}>Volver al comparativo</Boton> : null}
        </div>
      </form>
    </>
  );
}
