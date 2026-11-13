import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearSolicitud, obtenerCatalogos } from "../../api/cliente";
import { ErrorApi, type Errores } from "../../api/http";
import type { Catalogos } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { Campo, Casilla, Opciones, Selector } from "../../components/Campo";
import { Pasos } from "../../components/Pasos";
import { useFocoEnError } from "./useFocoEnError";

const VACIO = { nombre: "", tipoDocumento: "CC", numeroDocumento: "", correo: "", telefono: "", ciudad: "", ramo: "" };

// Ramos que piden datos de salud: llevan una autorización aparte.
const CON_DATOS_SENSIBLES = ["SALUD", "VIDA"];

export function PasoSolicitud() {
  const navegar = useNavigate();
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [valores, setValores] = useState(VACIO);
  const [autoriza, setAutoriza] = useState(false);
  const [autorizaSensibles, setAutorizaSensibles] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(0);
  useFocoEnError(errores, intento);

  useEffect(() => {
    obtenerCatalogos().then(setCatalogos).catch((e: Error) => setMensaje(e.message));
  }, []);

  const cambiar = (campo: keyof typeof VACIO) => (valor: string) => setValores((v) => ({ ...v, [campo]: valor }));
  // Una persona jurídica (NIT) solo puede cotizar Pymes y RC.
  const juridica = valores.tipoDocumento === "NIT";
  const sensibles = CON_DATOS_SENSIBLES.includes(valores.ramo);

  function cambiarDocumento(tipo: string) {
    setValores((v) => ({ ...v, tipoDocumento: tipo, ramo: tipo === "NIT" ? "PYMES" : v.ramo }));
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje("");
    try {
      const { token } = await crearSolicitud({ ...valores, autorizaDatos: autoriza, autorizaDatosSensibles: sensibles ? autorizaSensibles : undefined });
      navegar(`/solicitud/${token}`);
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      setMensaje(e.message);
      setIntento((n) => n + 1);
      setEnviando(false);
    }
  }

  return (
    <>
      <Pasos actual={1} />
      <h1>Solicitud de cotización</h1>
      <p className="cliente__intro">
        Escriba sus datos de contacto y elija el seguro que necesita. Con esta información consultamos a las aseguradoras y le
        mostramos un comparativo.
      </p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      {catalogos ? (
        <form onSubmit={enviar} noValidate>
          <fieldset className="seccion-formulario">
            <legend>Datos del tomador</legend>
            <Campo id="nombre" etiqueta="Nombre completo o razón social" autoComplete="name" value={valores.nombre}
              onChange={(e) => cambiar("nombre")(e.target.value)} error={errores.nombre} ancho />
            <div className="fila-campos">
              <Selector id="tipoDocumento" etiqueta="Tipo de documento" opciones={catalogos.tiposDocumento} value={valores.tipoDocumento}
                onChange={(e) => cambiarDocumento(e.target.value)} error={errores.tipoDocumento} />
              <Campo id="numeroDocumento" etiqueta="Número de documento" inputMode="numeric" value={valores.numeroDocumento}
                onChange={(e) => cambiar("numeroDocumento")(e.target.value)} error={errores.numeroDocumento} ayuda="Sin puntos ni espacios" />
            </div>
            <div className="fila-campos">
              <Campo id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" value={valores.correo}
                onChange={(e) => cambiar("correo")(e.target.value)} error={errores.correo} />
              <Campo id="telefono" etiqueta="Celular o teléfono fijo" type="tel" autoComplete="tel" value={valores.telefono}
                onChange={(e) => cambiar("telefono")(e.target.value)} error={errores.telefono} ayuda="10 dígitos, por ejemplo 3001234567" />
            </div>
            <Selector id="ciudad" etiqueta="Ciudad" opciones={catalogos.ciudades} value={valores.ciudad}
              onChange={(e) => cambiar("ciudad")(e.target.value)} error={errores.ciudad} />
          </fieldset>

          <fieldset className="seccion-formulario">
            <legend>Seguro que necesita</legend>
            <Opciones id="ramo" etiqueta="Ramo" valor={valores.ramo} opciones={juridica ? catalogos.ramos.filter((r) => r.codigo === "PYMES") : catalogos.ramos}
              onCambiar={cambiar("ramo")} error={errores.ramo}
              ayuda={juridica ? "Con NIT se cotiza el seguro para empresas." : "Solo le pediremos los datos que aplican al ramo que elija."} />
          </fieldset>

          <fieldset className="seccion-formulario">
            <legend>Tratamiento de datos personales</legend>
            <p className="cliente__intro texto-secundario">
              AS4 Seguros LTDA usará sus datos para cotizar con las aseguradoras aliadas, enviarle el comparativo y gestionar su póliza.
              Puede conocer, actualizar o suprimir sus datos escribiendo a la agencia.
            </p>
            <Casilla id="autorizaDatos" marcada={autoriza} onCambiar={setAutoriza} error={errores.autorizaDatos}>
              Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012. La agencia guarda la fecha, la hora y la versión de esta autorización.
            </Casilla>
            {sensibles ? (
              <Casilla id="autorizaDatosSensibles" marcada={autorizaSensibles} onCambiar={setAutorizaSensibles} error={errores.autorizaDatosSensibles}>
                Autorizo además el tratamiento de mis datos sensibles de salud, necesarios para cotizar este seguro.
              </Casilla>
            ) : null}
          </fieldset>

          <div className="acciones">
            <Boton type="submit" variante="principal" disabled={enviando}>{enviando ? "Enviando…" : "Continuar"}</Boton>
          </div>
        </form>
      ) : null}
    </>
  );
}
