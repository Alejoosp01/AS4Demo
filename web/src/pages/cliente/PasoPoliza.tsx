import { type FormEvent, useState } from "react";
import { decidirRenovacion, nombreDe, radicarPqr, reportarSiniestro } from "../../api/cliente";
import type { ErrorApi, Errores } from "../../api/http";
import type { Catalogos, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { useAviso } from "../../components/Avisos";
import { Boton } from "../../components/Boton";
import { AreaTexto, Campo, Opciones, Selector } from "../../components/Campo";
import { Icono } from "../../components/Icono";
import { Pasos } from "../../components/Pasos";
import { fecha, fechaHora, pesos, variacion } from "../../format/formato";
import "../../components/Tabla.css";

interface Props {
  solicitud: SolicitudVista;
  catalogos: Catalogos;
  onActualizada: (s: SolicitudVista) => void;
}

const ESTADO_SINIESTRO = { REPORTADO: "Reportado: su asesor lo va a radicar", RADICADO: "Radicado ante la aseguradora", CERRADO: "Cerrado" };
const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function useEnvio(onActualizada: Props["onActualizada"], alTerminar: () => void, confirmacion: string) {
  const avisar = useAviso();
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(accion: () => Promise<SolicitudVista>) {
    setEnviando(true);
    setMensaje("");
    setErrores({});
    try {
      onActualizada(await accion());
      avisar(confirmacion);
      alTerminar();
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      if (!e.errores || Object.keys(e.errores).length === 0) setMensaje(e.message);
    }
    setEnviando(false);
  }
  return { errores, mensaje, enviando, enviar };
}

/** T15 (siniestros): reporte con la lista de documentos que corresponde al ramo. */
function FormularioSiniestro({ solicitud, catalogos, onActualizada, onCerrar }: Props & { onCerrar: () => void }) {
  const [fechaEvento, setFechaEvento] = useState(hoyIso);
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [documentos, setDocumentos] = useState<string[]>([]);
  const { errores, mensaje, enviando, enviar } = useEnvio(onActualizada, onCerrar, "Siniestro reportado. Su asesor ya recibió el aviso y lo va a acompañar.");
  const lista = catalogos.documentosSiniestro[solicitud.ramo];
  const alternar = (codigo: string) => setDocumentos((d) => (d.includes(codigo) ? d.filter((x) => x !== codigo) : [...d, codigo]));

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    void enviar(() => reportarSiniestro(solicitud.token, { fechaEvento, lugar, descripcion, documentos }));
  }

  return (
    <form className="tarjeta-paso" onSubmit={alEnviar} noValidate aria-labelledby="titulo-siniestro">
      <h2 id="titulo-siniestro">Reportar un siniestro</h2>
      <p className="texto-secundario">Póliza {solicitud.poliza?.numero}. Avise dentro de los tres días siguientes al evento.</p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      <div className="fila-campos">
        <Campo id="fechaEvento" etiqueta="Fecha del evento" type="date" max={hoyIso()} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} error={errores.fechaEvento} />
        <Campo id="lugar" etiqueta="Lugar" ayuda="Ciudad y dirección o sitio" value={lugar} onChange={(e) => setLugar(e.target.value)} error={errores.lugar} />
      </div>
      <AreaTexto id="descripcion" etiqueta="¿Qué ocurrió?" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errores.descripcion} maxLength={1000} rows={3} />
      <fieldset className={`grupo-opciones${errores.documentos ? " grupo-opciones--error" : ""}`}>
        <legend>Documentos que adjunta</legend>
        <p className="campo__ayuda">Esta es la lista para su seguro. Los marcados como obligatorios son necesarios para radicar. En este prototipo se marcan; no se suben archivos.</p>
        {lista.map((d) => (
          <label key={d.codigo} className="opcion opcion--bloque">
            <input type="checkbox" checked={documentos.includes(d.codigo)} onChange={() => alternar(d.codigo)} />
            <span>{d.nombre}{d.obligatorio ? <em className="obligatorio"> · obligatorio</em> : null}</span>
          </label>
        ))}
        {errores.documentos ? <p className="campo__error" role="alert">{errores.documentos}</p> : null}
      </fieldset>
      <div className="acciones">
        <Boton type="submit" variante="principal" disabled={enviando}>Enviar el reporte</Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
      </div>
    </form>
  );
}

/** T15 (PQR): petición, queja o reclamo desde la plataforma. */
function FormularioPqr({ solicitud, catalogos, onActualizada, onCerrar }: Props & { onCerrar: () => void }) {
  const [tipo, setTipo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const { errores, mensaje, enviando, enviar } = useEnvio(onActualizada, onCerrar, "Solicitud radicada. Su asesor le responderá por este mismo medio.");

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    void enviar(() => radicarPqr(solicitud.token, { tipo, descripcion }));
  }

  return (
    <form className="tarjeta-paso" onSubmit={alEnviar} noValidate aria-labelledby="titulo-pqr">
      <h2 id="titulo-pqr">Radicar una petición, queja o reclamo</h2>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      <Opciones id="tipo" etiqueta="Tipo" valor={tipo} opciones={catalogos.tiposPqr} onCambiar={setTipo} error={errores.tipo} />
      <AreaTexto id="descripcionPqr" etiqueta="¿En qué le podemos ayudar?" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errores.descripcion} maxLength={1000} rows={3} />
      <div className="acciones">
        <Boton type="submit" variante="principal" disabled={enviando}>Radicar</Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
      </div>
    </form>
  );
}

/** T16 (renovación): el cliente decide en el mismo enlace, con la recotización que ya hizo la plataforma. */
function Renovacion({ solicitud, catalogos, onActualizada }: Props) {
  const r = solicitud.renovacion!;
  const [aseguradora, setAseguradora] = useState("");
  const [noRenueva, setNoRenueva] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { errores, mensaje, enviando, enviar } = useEnvio(onActualizada, () => undefined, "Su decisión de renovación quedó registrada.");

  if (r.decision) {
    return (
      <section className="tarjeta-paso tarjeta-paso--ok" aria-labelledby="titulo-renovacion">
        <h2 id="titulo-renovacion">Renovación</h2>
        <p>
          {r.decision === "RENOVADA"
            ? <>Renovó con <strong>{r.aseguradoraElegida}</strong> por {pesos(r.primaElegida ?? 0)} al año. Su póliza queda vigente hasta el {fecha(solicitud.poliza!.fechaVencimiento)}.</>
            : <>Indicó que no renueva esta póliza. Motivo: {nombreDe(catalogos.motivosNoRenovacion, r.motivoNoRenovacion).toLowerCase()}.</>}
        </p>
        <p className="texto-secundario">Decisión registrada el {fechaHora(r.decididaEn!)}.</p>
      </section>
    );
  }

  return (
    <section className="tarjeta-paso tarjeta-paso--alerta" aria-labelledby="titulo-renovacion">
      <h2 id="titulo-renovacion"><Icono nombre="renovar" /> Su póliza vence el {fecha(solicitud.poliza!.fechaVencimiento)}</h2>
      <p>
        Ya recotizamos su seguro con todas las aseguradoras, con sus datos actualizados. Hoy paga {pesos(r.primaActual)} al año con {r.aseguradoraActual}.
        Elija con cuál renueva; no tiene que volver a llenar ningún formulario.
      </p>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      <div className="tabla-contenedor" role="radiogroup" aria-labelledby="titulo-renovacion">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col"><span className="visualmente-oculto">Elegir</span></th>
              <th scope="col">Aseguradora</th>
              <th scope="col" className="numero">Prima anual</th>
              <th scope="col" className="numero">Frente a la actual</th>
              <th scope="col">Amparos</th>
              <th scope="col">Deducible</th>
            </tr>
          </thead>
          <tbody>
            {r.ofertas.map((o) => (
              <tr key={o.aseguradoraNombre} className={aseguradora === o.aseguradoraNombre ? "fila-elegida" : undefined} onClick={() => { setAseguradora(o.aseguradoraNombre); setNoRenueva(false); }}>
                <td>
                  <input type="radio" name="renovacion" checked={aseguradora === o.aseguradoraNombre} onChange={() => { setAseguradora(o.aseguradoraNombre); setNoRenueva(false); }}
                    aria-label={`Renovar con ${o.aseguradoraNombre}, prima anual ${pesos(o.primaAnual)}`} />
                </td>
                <td>{o.aseguradoraNombre}{o.esActual ? <span className="etiqueta-suave">Actual</span> : null}</td>
                <td className="numero">{pesos(o.primaAnual)}</td>
                <td className="numero">{variacion(r.primaActual, o.primaAnual)}</td>
                <td>{o.amparosIncluidos} de {o.amparosTotales}</td>
                <td>{o.deducible}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="texto-secundario">Ordenadas por cobertura y, a igual cobertura, por menor prima. AS4 Seguros recibe comisión de la aseguradora; la comisión no cambia este orden.</p>
      {errores.aseguradora ? <p className="campo__error" role="alert">{errores.aseguradora}</p> : null}

      {noRenueva ? (
        <Selector id="motivoNoRenovacion" etiqueta="¿Por qué no renueva?" opciones={catalogos.motivosNoRenovacion} value={motivo}
          onChange={(e) => setMotivo(e.target.value)} error={errores.motivo} />
      ) : null}
      <div className="acciones">
        {noRenueva ? (
          <>
            <Boton variante="principal" disabled={enviando} onClick={() => enviar(() => decidirRenovacion(solicitud.token, { decision: "NO_RENOVAR", motivo: motivo || undefined }))}>Confirmar que no renuevo</Boton>
            <Boton onClick={() => setNoRenueva(false)}>Volver a las ofertas</Boton>
          </>
        ) : (
          <>
            <Boton variante="principal" disabled={enviando} onClick={() => enviar(() => decidirRenovacion(solicitud.token, { decision: "RENOVAR", aseguradora: aseguradora || undefined }))}>Renovar mi póliza</Boton>
            <Boton variante="enlace" onClick={() => { setNoRenueva(true); setAseguradora(""); }}>No voy a renovar</Boton>
          </>
        )}
      </div>
    </section>
  );
}

/** Etapas 5 a 7 vistas por el cliente: póliza entregada (T14), siniestros y PQR (T15) y renovación (T16). */
export function PasoPoliza({ solicitud, catalogos, onActualizada }: Props) {
  const [abierto, setAbierto] = useState<"" | "siniestro" | "pqr">("");
  const poliza = solicitud.poliza!;
  const oferta = solicitud.ofertas.find((o) => o.id === solicitud.aceptacion?.ofertaId);
  const incluidos = oferta?.coberturas.filter((c) => c.incluida) ?? [];
  const excluidos = oferta?.coberturas.filter((c) => !c.incluida) ?? [];
  const casos = solicitud.siniestros.length + solicitud.pqrs.length;

  return (
    <>
      <Pasos actual={7} />
      <h1>Su póliza</h1>
      {solicitud.renovacion ? <Renovacion solicitud={solicitud} catalogos={catalogos} onActualizada={onActualizada} /> : null}

      <section className="poliza" aria-label="Resumen de la póliza">
        <header className="poliza__cabecera">
          <div>
            <p className="poliza__etiqueta">Póliza de {nombreDe(catalogos.ramos, solicitud.ramo).toLowerCase()}</p>
            <p className="poliza__numero" data-testid="numero-poliza">{poliza.numero}</p>
          </div>
          <p className="poliza__vigencia">Vigente del {fecha(poliza.fechaEmision)} al {fecha(poliza.fechaVencimiento)}</p>
        </header>
        <dl className="resumen">
          <dt>Tomador</dt>
          <dd>{solicitud.tomador.nombre}</dd>
          <dt>Aseguradora</dt>
          <dd>{oferta?.aseguradoraNombre}</dd>
          <dt>Prima anual</dt>
          <dd>{oferta ? pesos(oferta.primaAnual) : ""}{poliza.formaPago ? ` · ${nombreDe(catalogos.formasPago, poliza.formaPago).toLowerCase()}` : ""}</dd>
          <dt>Deducible</dt>
          <dd>{oferta?.deducible}</dd>
          <dt>Qué cubre</dt>
          <dd>{incluidos.map((c) => c.nombre).join(", ")}</dd>
          {excluidos.length > 0 ? (<><dt>Qué no cubre</dt><dd>{excluidos.map((c) => c.nombre).join(", ")}</dd></>) : null}
          {solicitud.aceptacion?.suscripcion?.resultado === "CON_CONDICIONES" ? (<><dt>Condición aceptada</dt><dd>{solicitud.aceptacion.suscripcion.detalle}</dd></>) : null}
          <dt>Línea de asistencia</dt>
          <dd>#274 desde celular · 01 8000 000 274 (números de ejemplo)</dd>
          <dt>Constancia de aceptación</dt>
          <dd data-testid="numero-constancia">{solicitud.aceptacion?.constancia}</dd>
        </dl>
      </section>

      {abierto === "" ? (
        <div className="acciones no-imprimir">
          <Boton variante="principal" onClick={() => setAbierto("siniestro")}><Icono nombre="escudo" tamano={17} />Reportar un siniestro</Boton>
          <Boton onClick={() => setAbierto("pqr")}>Radicar una PQR</Boton>
          <Boton variante="enlace" onClick={() => window.print()}>Imprimir</Boton>
        </div>
      ) : null}
      {abierto === "siniestro" ? <FormularioSiniestro solicitud={solicitud} catalogos={catalogos} onActualizada={onActualizada} onCerrar={() => setAbierto("")} /> : null}
      {abierto === "pqr" ? <FormularioPqr solicitud={solicitud} catalogos={catalogos} onActualizada={onActualizada} onCerrar={() => setAbierto("")} /> : null}

      {casos > 0 ? (
        <section className="seccion-casos" aria-labelledby="titulo-casos">
          <h2 id="titulo-casos">Sus casos</h2>
          <ul className="casos">
            {solicitud.siniestros.map((x) => (
              <li key={`s${x.id}`}>
                <strong>Siniestro del {fecha(x.fechaEvento ?? x.fechaReporte)}</strong> · {x.descripcion}
                <span className="casos__estado">
                  {x.estado === "CERRADO"
                    ? (x.resultado === "PAGADO" ? `Cerrado: pagado por ${pesos(x.valorPagado ?? 0)}` : "Cerrado: objetado por la aseguradora")
                    : ESTADO_SINIESTRO[x.estado]}
                </span>
              </li>
            ))}
            {solicitud.pqrs.map((x) => (
              <li key={`p${x.id}`}>
                <strong>{nombreDe(catalogos.tiposPqr, x.tipo)} del {fecha(x.fecha)}</strong> · {x.descripcion ?? x.asunto}
                <span className="casos__estado">{x.estado === "CERRADA" ? `Respondida: ${x.respuesta}` : "En trámite con su asesor"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
