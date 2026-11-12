import { type FormEvent, useState } from "react";
import { cancelarEleccion, confirmarAceptacion, nombreDe } from "../../api/cliente";
import { ErrorApi } from "../../api/http";
import type { Catalogos, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { Campo } from "../../components/Campo";
import { Pasos } from "../../components/Pasos";
import { fecha, fechaHora, pesos } from "../../format/formato";

interface Props {
  solicitud: SolicitudVista;
  catalogos: Catalogos;
  onActualizada: (s: SolicitudVista) => void;
}

function ResumenOferta({ solicitud, catalogos }: Omit<Props, "onActualizada">) {
  const oferta = solicitud.ofertas.find((o) => o.id === solicitud.aceptacion?.ofertaId);
  if (!oferta) return null;
  const { tomador } = solicitud;
  return (
    <dl className="resumen">
      <dt>Tomador</dt>
      <dd>{tomador.nombre}</dd>
      <dt>Documento</dt>
      <dd>{nombreDe(catalogos.tiposDocumento, tomador.tipoDocumento)} {tomador.numeroDocumento}</dd>
      <dt>Ramo</dt>
      <dd>{nombreDe(catalogos.ramos, solicitud.ramo)}</dd>
      <dt>Aseguradora</dt>
      <dd>{oferta.aseguradoraNombre}</dd>
      <dt>Prima anual</dt>
      <dd>{pesos(oferta.primaAnual)}</dd>
      <dt>Deducible</dt>
      <dd>{oferta.deducible}</dd>
      <dt>Amparos incluidos</dt>
      <dd>{oferta.coberturas.filter((c) => c.incluida).map((c) => c.nombre).join(", ")}</dd>
      {solicitud.aceptacion?.confirmadaEn ? (
        <>
          <dt>Autorización de datos</dt>
          <dd>{fechaHora(solicitud.autorizaDatosEn)}</dd>
        </>
      ) : null}
    </dl>
  );
}

export function PasoAceptacion({ solicitud, catalogos, onActualizada }: Props) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const celular = solicitud.tomador.telefono.slice(-4);

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje("");
    try {
      onActualizada(await confirmarAceptacion(solicitud.token, codigo));
    } catch (e) {
      const err = e as ErrorApi;
      if (err.errores?.codigo) setError(err.errores.codigo);
      else setMensaje(err.message);
      document.getElementById("codigo")?.focus();
      setEnviando(false);
    }
  }

  async function cambiar() {
    setEnviando(true);
    try {
      onActualizada(await cancelarEleccion(solicitud.token));
    } catch (e) {
      setMensaje((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <>
      <Pasos actual={4} />
      <h1>Aceptación de la oferta</h1>
      <p className="cliente__intro">Revise el resumen. Si está de acuerdo, confirme con el código que le enviamos.</p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      <ResumenOferta solicitud={solicitud} catalogos={catalogos} />
      <div className="codigo" aria-live="polite">
        <p>Enviamos un código de 6 dígitos al celular terminado en {celular}.</p>
        <p className="codigo__valor" data-testid="codigo-confirmacion">{solicitud.aceptacion?.codigo}</p>
      </div>
      <form onSubmit={confirmar} noValidate>
        <Campo id="codigo" etiqueta="Código de confirmación" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={codigo} onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "")); setError(""); }} error={error} />
        <div className="acciones">
          <Boton type="submit" variante="principal" disabled={enviando}>Confirmar aceptación</Boton>
          <Boton onClick={cambiar} disabled={enviando}>Cambiar de oferta</Boton>
        </div>
      </form>
    </>
  );
}

export function Constancia({ solicitud, catalogos }: Omit<Props, "onActualizada">) {
  const aceptacion = solicitud.aceptacion!;
  return (
    <>
      <Pasos actual={4} />
      <h1>Constancia de aceptación</h1>
      <Aviso>
        <p>Su aceptación quedó registrada. Un asesor lo contactará para emitir la póliza.</p>
      </Aviso>
      <dl className="resumen">
        <dt>Número de constancia</dt>
        <dd data-testid="numero-constancia">{aceptacion.constancia}</dd>
        <dt>Fecha y hora</dt>
        <dd>{fechaHora(aceptacion.confirmadaEn!)}</dd>
        {solicitud.poliza ? (
          <>
            <dt>Póliza</dt>
            <dd>{solicitud.poliza.numero}, vigente hasta el {fecha(solicitud.poliza.fechaVencimiento)}</dd>
          </>
        ) : null}
      </dl>
      <ResumenOferta solicitud={solicitud} catalogos={catalogos} />
      <div className="acciones no-imprimir">
        <Boton onClick={() => window.print()}>Imprimir constancia</Boton>
      </div>
    </>
  );
}
