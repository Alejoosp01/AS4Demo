import { type FormEvent, useState } from "react";
import { elegirOferta, nombreDe, registrarNoInteres } from "../../api/cliente";
import { ErrorApi, type Errores } from "../../api/http";
import type { Catalogos, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { AreaTexto, Selector } from "../../components/Campo";
import { Comparativo } from "../../components/Comparativo";
import { Pasos } from "../../components/Pasos";
import { useFocoEnError } from "./useFocoEnError";

interface Props {
  solicitud: SolicitudVista;
  catalogos: Catalogos;
  onActualizada: (s: SolicitudVista) => void;
  onModificar?: () => void;
}

export function PasoComparativo({ solicitud, catalogos, onActualizada, onModificar }: Props) {
  const [elegida, setElegida] = useState<number | null>(null);
  const [errorEleccion, setErrorEleccion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarNoInteres, setMostrarNoInteres] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [intento, setIntento] = useState(0);
  useFocoEnError(errores, intento);

  const recomendada = solicitud.asesoria?.ofertaRecomendadaId ?? null;
  const nombreRecomendada = solicitud.ofertas.find((o) => o.id === recomendada)?.aseguradoraNombre;

  async function elegir() {
    if (elegida === null) {
      setErrorEleccion("Seleccione una oferta del comparativo");
      return;
    }
    setEnviando(true);
    setMensaje("");
    try {
      onActualizada(await elegirOferta(solicitud.token, elegida));
    } catch (error) {
      setMensaje((error as Error).message);
      setEnviando(false);
    }
  }

  async function enviarNoInteres(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje("");
    try {
      onActualizada(await registrarNoInteres(solicitud.token, { motivo, detalle: detalle.trim() || undefined }));
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      if (!e.errores || Object.keys(e.errores).length === 0) setMensaje(e.message);
      setIntento((n) => n + 1);
      setEnviando(false);
    }
  }

  return (
    <>
      <Pasos actual={4} />
      <h1 id="titulo-comparativo">Comparativo de ofertas</h1>
      <p className="cliente__intro">
        Seguro de {nombreDe(catalogos.ramos, solicitud.ramo).toLowerCase()} para {solicitud.tomador.nombre}. Las primas son anuales.
      </p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      {solicitud.asesoria && nombreRecomendada ? (
        <Aviso>
          <p><strong>Recomendación de su asesor ({solicitud.asesoria.asesor}):</strong> {nombreRecomendada}.</p>
          <p>{solicitud.asesoria.criterio}</p>
        </Aviso>
      ) : null}

      {solicitud.ofertas.length === 0 ? (
        <Aviso tipo="alerta">
          <p>Ninguna aseguradora cotizó este riesgo con los datos enviados. Un asesor lo contactará para revisar otras opciones.</p>
        </Aviso>
      ) : (
        <>
          <Comparativo
            ofertas={solicitud.ofertas}
            recomendadaId={recomendada}
            seleccion={{ valor: elegida, onCambiar: (id) => { setElegida(id); setErrorEleccion(""); }, error: errorEleccion }}
          />
          <p className="texto-secundario cliente__intro">
            AS4 Seguros recibe una comisión de la aseguradora que usted elija. La comisión no cambia el orden de este comparativo.
          </p>
          <div className="acciones">
            <Boton variante="principal" onClick={elegir} disabled={enviando}>Elegir oferta</Boton>
            {onModificar ? <Boton onClick={onModificar}>Modificar mis datos</Boton> : null}
            {!mostrarNoInteres ? <Boton variante="enlace" onClick={() => setMostrarNoInteres(true)}>No me interesa</Boton> : null}
          </div>
        </>
      )}

      {mostrarNoInteres || solicitud.ofertas.length === 0 ? (
        <section className="no-interes" aria-labelledby="titulo-no-interes">
          <h2 id="titulo-no-interes">No me interesa</h2>
          <p className="cliente__intro texto-secundario">Cuéntenos por qué no continúa. Nos sirve para mejorar las opciones que ofrecemos.</p>
          <form onSubmit={enviarNoInteres} noValidate>
            <Selector id="motivo" etiqueta="Motivo" opciones={catalogos.motivosNoInteres} value={motivo}
              onChange={(e) => setMotivo(e.target.value)} error={errores.motivo} />
            <AreaTexto id="detalle" etiqueta={motivo === "OTRO" ? "Cuéntenos el motivo" : "Comentario (opcional)"} value={detalle}
              onChange={(e) => setDetalle(e.target.value)} error={errores.detalle} maxLength={300} />
            <div className="acciones">
              <Boton type="submit" disabled={enviando}>Enviar respuesta</Boton>
              {solicitud.ofertas.length > 0 ? <Boton variante="enlace" onClick={() => setMostrarNoInteres(false)}>Cancelar</Boton> : null}
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
