import { useState } from "react";
import { pagarPrima, responderCondiciones } from "../../api/cliente";
import type { Catalogos, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { Opciones } from "../../components/Campo";
import { Icono } from "../../components/Icono";
import { Pasos } from "../../components/Pasos";
import { fechaHora, pesos } from "../../format/formato";
import { ResumenOferta } from "./PasoAceptacion";

interface Props {
  solicitud: SolicitudVista;
  catalogos: Catalogos;
  onActualizada: (s: SolicitudVista) => void;
}

/** Etapa 5 del proceso: respuesta de la aseguradora (T11), condiciones y pago del cliente (T12). */
export function PasoPago({ solicitud, catalogos, onActualizada }: Props) {
  const [formaPago, setFormaPago] = useState("CONTADO");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const aceptacion = solicitud.aceptacion!;
  const suscripcion = aceptacion.suscripcion;
  const oferta = solicitud.ofertas.find((o) => o.id === aceptacion.ofertaId);
  const conCondiciones = suscripcion?.resultado === "CON_CONDICIONES";
  const pendientes = conCondiciones && !suscripcion?.condicionesAceptadasEn;

  async function ejecutar(accion: () => Promise<SolicitudVista>) {
    setEnviando(true);
    setMensaje("");
    try {
      onActualizada(await accion());
    } catch (e) {
      setMensaje((e as Error).message);
    }
    setEnviando(false);
  }

  return (
    <>
      <Pasos actual={6} />
      <h1>Suscripción y pago</h1>
      <p className="cliente__intro">
        Su aceptación quedó firmada (constancia <span data-testid="numero-constancia">{aceptacion.constancia}</span>) y la plataforma
        radicó la solicitud ante {oferta?.aseguradoraNombre}.
      </p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}

      <section className={`tarjeta-paso${conCondiciones ? " tarjeta-paso--alerta" : " tarjeta-paso--ok"}`} aria-labelledby="titulo-suscripcion">
        <h2 id="titulo-suscripcion"><Icono nombre="escudo" /> Respuesta de {oferta?.aseguradoraNombre}</h2>
        {suscripcion ? (
          <>
            <p><strong>{suscripcion.revision}:</strong> {suscripcion.detalle}</p>
            <p className="texto-secundario">Respuesta del {fechaHora(suscripcion.suscritaEn)}.</p>
          </>
        ) : <p>La aseguradora está evaluando el riesgo.</p>}

        {pendientes ? (
          <>
            <p>
              La aseguradora aceptó su riesgo <strong>con una condición</strong>. Puede aceptarla y seguir con el pago, o volver al
              comparativo y elegir otra opción.
            </p>
            <div className="acciones">
              <Boton variante="principal" disabled={enviando} onClick={() => ejecutar(() => responderCondiciones(solicitud.token, true))}>Acepto la condición</Boton>
              <Boton disabled={enviando} onClick={() => ejecutar(() => responderCondiciones(solicitud.token, false))}>No la acepto: ver otras opciones</Boton>
            </div>
          </>
        ) : null}
        {conCondiciones && !pendientes ? <p className="texto-secundario">Usted aceptó esta condición el {fechaHora(suscripcion!.condicionesAceptadasEn!)}.</p> : null}
      </section>

      <ResumenOferta solicitud={solicitud} catalogos={catalogos} />

      {!pendientes ? (
        <section className="tarjeta-paso" aria-labelledby="titulo-pago">
          <h2 id="titulo-pago">Pago de la prima</h2>
          <p>Valor a pagar: <strong className="valor-destacado">{oferta ? pesos(oferta.primaAnual) : ""}</strong> por un año de vigencia.</p>
          <Opciones id="formaPago" etiqueta="Forma de pago" valor={formaPago} opciones={catalogos.formasPago} onCambiar={setFormaPago} />
          <p className="texto-secundario">Pasarela de pago simulada: en este prototipo no se hace ningún cobro.</p>
          <div className="acciones">
            <Boton variante="principal" disabled={enviando} onClick={() => ejecutar(() => pagarPrima(solicitud.token, formaPago))}>
              {enviando ? <span className="girador" aria-hidden="true" /> : null}Pagar la prima
            </Boton>
          </div>
        </section>
      ) : null}
    </>
  );
}
