import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import type { ErrorApi, Errores } from "../../api/http";
import { emitirPoliza, guardarAsesoria, obtenerSolicitudInterna } from "../../api/interno";
import type { Catalogos, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { AreaTexto, Campo, Selector } from "../../components/Campo";
import { Comparativo } from "../../components/Comparativo";
import { Estado } from "../../components/Estado";
import { fecha, fechaHora, pesos } from "../../format/formato";
import { datosRiesgo, datosSarlaft } from "./datosRiesgo";
import "./Asesor.css";

const CRITERIO_MINIMO = 30;

function Datos({ titulo, filas }: { titulo: string; filas: [string, string][] }) {
  if (filas.length === 0) return null;
  return (
    <section className="bloque">
      <h2>{titulo}</h2>
      <dl className="resumen">
        {filas.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FormularioAsesoria({ solicitud, onGuardada }: { solicitud: SolicitudVista; onGuardada: (s: SolicitudVista) => void }) {
  const [oferta, setOferta] = useState("");
  const [criterio, setCriterio] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const largo = criterio.trim().length;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje("");
    try {
      onGuardada(await guardarAsesoria(solicitud.id, { ofertaRecomendadaId: oferta ? Number(oferta) : undefined, criterio }));
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      if (!e.errores || Object.keys(e.errores).length === 0) setMensaje(e.message);
      const primero = Object.keys(e.errores ?? {})[0];
      if (primero) document.getElementById(primero)?.focus();
      setEnviando(false);
    }
  }

  return (
    <section className="seccion" aria-labelledby="titulo-asesoria">
      <h2 id="titulo-asesoria">Registrar asesoría</h2>
      <p className="texto-secundario">El criterio queda registrado como sustento de la recomendación y no se puede modificar después.</p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      <form onSubmit={guardar} noValidate>
        <Selector id="ofertaRecomendadaId" etiqueta="Oferta recomendada" ancho value={oferta} onChange={(e) => setOferta(e.target.value)}
          opciones={solicitud.ofertas.map((o) => ({ codigo: String(o.id), nombre: `${o.aseguradoraNombre}, ${pesos(o.primaAnual)}` }))}
          error={errores.ofertaRecomendadaId} />
        <AreaTexto id="criterio" etiqueta="Criterio de la recomendación" ayuda={`Explique por qué recomienda esta oferta. Mínimo ${CRITERIO_MINIMO} caracteres.`}
          value={criterio} onChange={(e) => setCriterio(e.target.value)} error={errores.criterio} maxLength={2000} rows={4} />
        <p className={`contador${largo >= CRITERIO_MINIMO ? " contador--ok" : ""}`} aria-live="polite">
          {largo} de {CRITERIO_MINIMO} caracteres mínimos
        </p>
        <Boton type="submit" variante="principal" disabled={enviando}>Guardar asesoría</Boton>
      </form>
    </section>
  );
}

function sumarUnAnio(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FormularioEmision({ solicitud, onEmitida }: { solicitud: SolicitudVista; onEmitida: (s: SolicitudVista) => void }) {
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState(sumarUnAnio);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function emitir(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje("");
    try {
      onEmitida(await emitirPoliza(solicitud.id, { numero, fechaVencimiento: vencimiento }));
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      if (!e.errores || Object.keys(e.errores).length === 0) setMensaje(e.message);
      setEnviando(false);
    }
  }

  return (
    <section className="seccion" aria-labelledby="titulo-emision">
      <h2 id="titulo-emision">Emisión de la póliza</h2>
      <p className="texto-secundario">Registre los datos de la póliza que expidió la aseguradora.</p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      <form onSubmit={emitir} noValidate>
        <div className="fila-campos">
          <Campo id="numero" etiqueta="Número de póliza" value={numero} onChange={(e) => setNumero(e.target.value)} error={errores.numero} />
          <Campo id="fechaVencimiento" etiqueta="Fecha de vencimiento" type="date" value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)} error={errores.fechaVencimiento} />
        </div>
        <Boton type="submit" variante="principal" disabled={enviando}>Marcar como emitida</Boton>
      </form>
    </section>
  );
}

export function DetalleSolicitud() {
  const { id = "" } = useParams();
  const [solicitud, setSolicitud] = useState<SolicitudVista | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    Promise.all([obtenerSolicitudInterna(id), obtenerCatalogos()])
      .then(([s, c]) => { setSolicitud(s); setCatalogos(c); })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <Aviso tipo="error"><p>{error}</p><p><Link to="/asesor">Volver a la bandeja</Link></p></Aviso>;
  if (!solicitud || !catalogos) return <p className="texto-secundario">Cargando la solicitud…</p>;

  const s = solicitud;
  const enlace = `${window.location.origin}/solicitud/${s.token}`;
  const elegida = s.ofertas.find((o) => o.id === s.aceptacion?.ofertaId);
  const recomendada = s.ofertas.find((o) => o.id === s.asesoria?.ofertaRecomendadaId);

  async function copiar() {
    await navigator.clipboard?.writeText(enlace).catch(() => undefined);
    setCopiado(true);
  }

  return (
    <>
      <p className="no-imprimir"><Link to="/asesor">Volver a la bandeja</Link></p>
      <div className="cabecera-pagina">
        <h1>Solicitud N.º {s.id}</h1>
        <Estado estado={s.estado} />
      </div>
      <p className="detalle-meta">
        {nombreDe(catalogos.ramos, s.ramo)} · Recibida el {fechaHora(s.creadaEn)} · Asesor: {s.asesor ?? "sin asignar"}
      </p>

      <div className="enlace-cliente no-imprimir">
        <span>Enlace del cliente:</span>
        <code>{enlace}</code>
        <Boton variante="enlace" onClick={copiar}>{copiado ? "Copiado" : "Copiar enlace"}</Boton>
      </div>

      <div className="bloques">
        <Datos titulo="Tomador" filas={[
          ["Nombre", s.tomador.nombre],
          ["Documento", `${nombreDe(catalogos.tiposDocumento, s.tomador.tipoDocumento)} ${s.tomador.numeroDocumento}`],
          ["Correo", s.tomador.correo],
          ["Teléfono", s.tomador.telefono],
          ["Autorización de datos", fechaHora(s.autorizaDatosEn)],
        ]} />
        <Datos titulo="Datos del riesgo" filas={datosRiesgo(s.ramo, s.datosRamo, catalogos)} />
        <Datos titulo="SARLAFT" filas={datosSarlaft(s.sarlaft)} />
      </div>

      {s.estado === "NUEVA" ? (
        <Aviso tipo="alerta"><p>El cliente aún no ha diligenciado el formulario del ramo. Puede enviarle el enlace de arriba.</p></Aviso>
      ) : null}

      {s.ofertas.length > 0 ? (
        <section className="seccion">
          <h2 id="titulo-comparativo">Comparativo</h2>
          <Comparativo ofertas={s.ofertas} recomendadaId={s.asesoria?.ofertaRecomendadaId} />
        </section>
      ) : null}

      {s.asesoria ? (
        <section className="seccion">
          <h2>Asesoría</h2>
          <dl className="resumen">
            <dt>Oferta recomendada</dt>
            <dd>{recomendada ? `${recomendada.aseguradoraNombre}, ${pesos(recomendada.primaAnual)}` : "—"}</dd>
            <dt>Criterio</dt>
            <dd>{s.asesoria.criterio}</dd>
            <dt>Registrada por</dt>
            <dd>{s.asesoria.asesor}, {fechaHora(s.asesoria.creadaEn)}</dd>
          </dl>
        </section>
      ) : s.estado === "COTIZADA" ? (
        <FormularioAsesoria solicitud={s} onGuardada={setSolicitud} />
      ) : null}

      {s.noInteres ? (
        <section className="seccion">
          <h2>No interesado</h2>
          <dl className="resumen">
            <dt>Motivo</dt>
            <dd>{nombreDe(catalogos.motivosNoInteres, s.noInteres.motivo)}</dd>
            {s.noInteres.detalle ? (<><dt>Detalle</dt><dd>{s.noInteres.detalle}</dd></>) : null}
          </dl>
        </section>
      ) : null}

      {s.aceptacion && elegida ? (
        <section className="seccion">
          <h2>Aceptación del cliente</h2>
          <dl className="resumen">
            <dt>Oferta elegida</dt>
            <dd>{elegida.aseguradoraNombre}, {pesos(elegida.primaAnual)}</dd>
            <dt>Estado</dt>
            <dd>{s.aceptacion.confirmadaEn ? `Confirmada el ${fechaHora(s.aceptacion.confirmadaEn)}` : "Pendiente de confirmar con el código"}</dd>
            {s.aceptacion.constancia ? (<><dt>Constancia</dt><dd>{s.aceptacion.constancia}</dd></>) : null}
          </dl>
        </section>
      ) : null}

      {s.estado === "ACEPTADA" ? <FormularioEmision solicitud={s} onEmitida={setSolicitud} /> : null}

      {s.poliza ? (
        <section className="seccion">
          <h2>Póliza</h2>
          <dl className="resumen">
            <dt>Número</dt>
            <dd>{s.poliza.numero}</dd>
            <dt>Vigencia</dt>
            <dd>{fecha(s.poliza.fechaEmision)} a {fecha(s.poliza.fechaVencimiento)}</dd>
          </dl>
        </section>
      ) : null}
    </>
  );
}
