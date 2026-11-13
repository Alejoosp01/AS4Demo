import type React from "react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import type { ErrorApi, Errores } from "../../api/http";
import { emitirPoliza, guardarAsesoria, obtenerSolicitudInterna } from "../../api/interno";
import type { Catalogos, SolicitudInterna } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { useAviso } from "../../components/Avisos";
import { AreaTexto, Campo } from "../../components/Campo";
import { Comparativo } from "../../components/Comparativo";
import { Esqueleto } from "../../components/Esqueleto";
import { Estado } from "../../components/Estado";
import { Icono } from "../../components/Icono";
import { useSesion } from "../../sesion/Sesion";
import { fecha, fechaHora, hace, pesos } from "../../format/formato";
import { datosRiesgo, datosSarlaft } from "./datosRiesgo";
import "./Asesor.css";

const CRITERIO_MINIMO = 30;

type AlGuardar = (s: SolicitudInterna) => void;

// ---------------------------------------------------------------------------
// Recorrido del proceso: muestra en qué paso va la solicitud y quién hace cada uno.

type EstadoPaso = "hecho" | "actual" | "pendiente" | "omitido";

function pasosDelProceso(s: SolicitudInterna): { nombre: string; quien: string; estado: EstadoPaso; nota?: string }[] {
  const cotizada = s.estado !== "NUEVA" && s.estado !== "CERRADA";
  const aceptada = s.estado === "ACEPTADA" || s.estado === "EMITIDA";
  const hechos = [true, cotizada, Boolean(s.asesoria), aceptada, s.estado === "EMITIDA"];
  const detenida = s.estado === "NO_INTERESADA" || s.estado === "CERRADA";
  const actual = detenida ? -1 : hechos.findIndex((h, i) => !h && !(i === 2 && aceptada));
  const nombres = [
    ["Solicitud", "Cliente"],
    ["Datos y cotización", "Cliente y plataforma"],
    ["Asesoría", "Asesor"],
    ["Aceptación", "Cliente"],
    ["Emisión", "Asesor"],
  ];
  return nombres.map(([nombre, quien], i) => {
    if (hechos[i]) return { nombre, quien, estado: "hecho" };
    if (i === 2 && aceptada) return { nombre, quien, estado: "omitido", nota: "Sin asesoría registrada" };
    return { nombre, quien, estado: i === actual ? "actual" : "pendiente" };
  });
}

function Recorrido({ solicitud }: { solicitud: SolicitudInterna }) {
  const pasos = pasosDelProceso(solicitud);
  const detenida = solicitud.estado === "NO_INTERESADA" ? "El cliente no continuó" : solicitud.estado === "CERRADA" ? "Cerrada por falta de datos" : "";
  return (
    <>
      <ol className="recorrido" aria-label="Avance de la solicitud">
        {pasos.map((p, i) => (
          <li key={p.nombre} className={`recorrido__paso recorrido__paso--${p.estado} en-cascada`} style={{ "--i": i } as React.CSSProperties} aria-current={p.estado === "actual" ? "step" : undefined}>
            <span className="recorrido__numero" aria-hidden="true">{p.estado === "hecho" ? "✓" : i + 1}</span>
            <span className="recorrido__nombre">{p.nombre}</span>
            <span className="recorrido__quien">
              {p.nota ?? p.quien}
              <span className="visualmente-oculto">
                {p.estado === "hecho" ? ", terminado" : p.estado === "actual" ? ", paso actual" : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {detenida ? <p className="recorrido__detenida">{detenida}. El proceso terminó aquí.</p> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Contacto con el cliente: enlace de la solicitud y accesos directos para llamar o escribir.

function Contacto({ solicitud, mensaje }: { solicitud: SolicitudInterna; mensaje: string }) {
  const [copiado, setCopiado] = useState(false);
  const avisar = useAviso();
  const enlace = `${window.location.origin}/solicitud/${solicitud.token}`;
  const { telefono, correo } = solicitud.tomador;
  const texto = `${mensaje} ${enlace}`;

  async function copiar() {
    await navigator.clipboard?.writeText(enlace).catch(() => undefined);
    setCopiado(true);
    avisar("Enlace copiado. Ya puede pegarlo en el mensaje al cliente.");
  }

  return (
    <div className="contacto no-imprimir">
      <div className="contacto__acciones">
        <a className="boton boton--principal" href={`tel:${telefono}`}><Icono nombre="telefono" tamano={17} />Llamar al {telefono}</a>
        {telefono.startsWith("3") ? (
          <a className="boton boton--secundario" href={`https://wa.me/57${telefono}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
            Escribir por WhatsApp
          </a>
        ) : null}
        <a className="boton boton--secundario" href={`mailto:${correo}?subject=${encodeURIComponent("Su cotización con AS4 Seguros")}&body=${encodeURIComponent(texto)}`}>
          Enviar correo
        </a>
      </div>
      <div className="enlace-cliente">
        <span>Enlace del cliente:</span>
        <code>{enlace}</code>
        <Boton variante="enlace" onClick={copiar}>{copiado ? "Copiado" : "Copiar enlace"}</Boton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formularios de las dos tareas del asesor: asesoría y emisión.

const SUGERENCIAS = [
  { nombre: "Mayor cobertura", texto: "Recomiendo esta oferta porque es la que incluye más amparos para el riesgo del cliente; " },
  { nombre: "Menor prima", texto: "Recomiendo esta oferta porque el cliente priorizó el presupuesto y es la de menor prima que conserva los amparos básicos; " },
  { nombre: "Menor deducible", texto: "Recomiendo esta oferta porque el cliente pidió pagar el menor deducible posible en caso de siniestro; " },
  { nombre: "Necesidad del cliente", texto: "Recomiendo esta oferta porque cubre la necesidad que el cliente manifestó: " },
];

function FormularioAsesoria({ solicitud, onGuardada }: { solicitud: SolicitudInterna; onGuardada: AlGuardar }) {
  const [oferta, setOferta] = useState<number | null>(null);
  const [criterio, setCriterio] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const largo = criterio.trim().length;
  const elegida = solicitud.ofertas.find((o) => o.id === oferta);
  const faltan = [
    oferta === null ? "elegir la oferta que recomienda" : "",
    largo < CRITERIO_MINIMO ? `escribir el criterio (${largo} de ${CRITERIO_MINIMO} caracteres)` : "",
  ].filter(Boolean);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje("");
    try {
      onGuardada(await guardarAsesoria(solicitud.id, { ofertaRecomendadaId: oferta ?? undefined, criterio }));
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      if (!e.errores || Object.keys(e.errores).length === 0) setMensaje(e.message);
      if (e.errores?.criterio) document.getElementById("criterio")?.focus();
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}

      <h3 id="titulo-comparativo"><span className="numero-paso">1</span> Elija la oferta que recomienda</h3>
      <Comparativo ofertas={solicitud.ofertas} paraAsesor
        seleccion={{ valor: oferta, onCambiar: setOferta, error: errores.ofertaRecomendadaId }} />

      <h3><span className="numero-paso">2</span> Escriba por qué la recomienda</h3>
      <p className="texto-secundario">
        El criterio queda registrado como sustento de la recomendación y no se puede modificar después.
        Puede partir de una de estas frases y completarla:
      </p>
      <div className="sugerencias">
        {SUGERENCIAS.map((s) => (
          <button key={s.nombre} type="button" className="ficha" onClick={() => { setCriterio(s.texto); document.getElementById("criterio")?.focus(); }}>
            {s.nombre}
          </button>
        ))}
      </div>
      <AreaTexto id="criterio" etiqueta="Criterio de la recomendación" ayuda={`Mínimo ${CRITERIO_MINIMO} caracteres.`}
        value={criterio} onChange={(e) => setCriterio(e.target.value)} error={errores.criterio} maxLength={2000} rows={4} />
      <div className="progreso" aria-hidden="true">
        <div className={`progreso__barra${largo >= CRITERIO_MINIMO ? " progreso__barra--ok" : ""}`}
          style={{ width: `${Math.min(100, (largo / CRITERIO_MINIMO) * 100)}%` }} />
      </div>
      <p className={`contador${largo >= CRITERIO_MINIMO ? " contador--ok" : ""}`} aria-live="polite">
        {largo >= CRITERIO_MINIMO ? <Icono nombre="ok" tamano={15} /> : null} {largo} de {CRITERIO_MINIMO} caracteres mínimos
      </p>

      <div className="acciones">
        <Boton type="submit" variante="principal" disabled={enviando}>{enviando ? <span className="girador" aria-hidden="true" /> : null}Guardar asesoría</Boton>
        <span className="texto-secundario" aria-live="polite">
          {faltan.length > 0
            ? `Falta ${faltan.join(" y ")}.`
            : `Recomendará ${elegida?.aseguradoraNombre}, ${elegida ? pesos(elegida.primaAnual) : ""} al año.`}
        </span>
      </div>
    </form>
  );
}

function sumarUnAnio(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FormularioEmision({ solicitud, onEmitida }: { solicitud: SolicitudInterna; onEmitida: AlGuardar }) {
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState(sumarUnAnio);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const elegida = solicitud.ofertas.find((o) => o.id === solicitud.aceptacion?.ofertaId);

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
    <form onSubmit={emitir} noValidate>
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
      {elegida ? (
        <p className="oferta-aceptada">
          Oferta aceptada: <strong>{elegida.aseguradoraNombre}</strong>, {pesos(elegida.primaAnual)} al año. Deducible: {elegida.deducible}.
        </p>
      ) : null}
      <h3><span className="numero-paso">1</span> Tramite la expedición con la aseguradora</h3>
      <p className="texto-secundario">Los datos del riesgo y el SARLAFT ya están completos y validados; no hay que pedírselos de nuevo al cliente.</p>
      <h3><span className="numero-paso">2</span> Registre la póliza expedida</h3>
      <div className="fila-campos">
        <Campo id="numero" etiqueta="Número de póliza" ayuda="Tal como aparece en la carátula" value={numero}
          onChange={(e) => setNumero(e.target.value)} error={errores.numero} />
        <Campo id="fechaVencimiento" etiqueta="Fecha de vencimiento" ayuda="Se propone un año de vigencia" type="date" value={vencimiento}
          onChange={(e) => setVencimiento(e.target.value)} error={errores.fechaVencimiento} />
      </div>
      <Boton type="submit" variante="principal" disabled={enviando}>{enviando ? <span className="girador" aria-hidden="true" /> : null}Marcar como emitida</Boton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Panel «Qué sigue»: una sola acción a la vez, deducida del estado de la solicitud.

function PanelQueSigue({ solicitud, onCambio }: { solicitud: SolicitudInterna; onCambio: AlGuardar }) {
  const { usuario } = useSesion();
  const s = solicitud;
  const paso = s.siguientePaso;
  const nombre = s.tomador.nombre.split(" ")[0];
  const firma = `Le escribe ${usuario?.nombre ?? "su asesor"}, de AS4 Seguros.`;
  const quien = { ASESOR: "Le corresponde a usted", CLIENTE: "Le corresponde al cliente", NADIE: "Proceso terminado" }[paso.responsable];

  let contenido: ReactNode = null;
  switch (paso.codigo) {
    case "REGISTRAR_ASESORIA":
      contenido = <FormularioAsesoria solicitud={s} onGuardada={onCambio} />;
      break;
    case "EMITIR_POLIZA":
      contenido = <FormularioEmision solicitud={s} onEmitida={onCambio} />;
      break;
    case "CONTACTAR_CLIENTE":
    case "ESPERAR_DATOS": {
      const sinEmpezar = !s.borrador;
      const lista = s.pendientes.map((p) => p.etiqueta.toLowerCase()).join(", ");
      contenido = (
        <>
          <p>
            {sinEmpezar
              ? "El cliente todavía no ha empezado el formulario del ramo."
              : <>Al cliente solo le {s.pendientes.length === 1 ? "falta 1 dato" : `faltan ${s.pendientes.length} datos`}: <strong>{lista}</strong>.</>}
          </p>
          <ul className="seguimiento">
            <li className={s.seguimiento.recordatorioEn ? "seguimiento--hecho" : undefined}>
              Recordatorio al cliente a las 24 horas{s.seguimiento.recordatorioEn ? `: enviado el ${fechaHora(s.seguimiento.recordatorioEn)}` : ": pendiente"}.
            </li>
            <li className={s.seguimiento.alertaAsesorEn ? "seguimiento--hecho" : undefined}>
              Alerta al asesor a las 48 horas{s.seguimiento.alertaAsesorEn ? `: recibida el ${fechaHora(s.seguimiento.alertaAsesorEn)}` : ": pendiente"}.
            </li>
            <li>Cierre automático a los cinco días hábiles de recibida ({hace(s.creadaEn)}).</li>
          </ul>
          <Contacto solicitud={s} mensaje={sinEmpezar
            ? `Hola, ${nombre}. ${firma} Para enviarle su comparativo solo necesitamos los datos del seguro. Puede diligenciarlos una sola vez aquí:`
            : `Hola, ${nombre}. ${firma} Para enviarle su comparativo solo ${s.pendientes.length === 1 ? "falta este dato" : "faltan estos datos"}: ${lista}. Puede completarlos aquí:`} />
        </>
      );
      break;
    }
    case "ESPERAR_DECISION":
    case "ESPERAR_CODIGO":
      contenido = <Contacto solicitud={s} mensaje={`Hola, ${nombre}. ${firma} Ya puede ver su comparativo con mi recomendación y elegir la oferta aquí:`} />;
      break;
    case "GESTIONAR_RENOVACION":
      contenido = <p><Link className="boton boton--principal" to="/asesor/renovaciones">Ver la propuesta de renovación</Link></p>;
      break;
    default:
      contenido = null;
  }

  return (
    <section id="que-sigue" key={paso.codigo} className={`panel-sigue panel-sigue--${paso.responsable.toLowerCase()} pagina`} aria-labelledby="titulo-sigue">
      <p className="panel-sigue__quien">Qué sigue · {quien}</p>
      <h2 id="titulo-sigue">{paso.titulo}</h2>
      {paso.descripcion ? <p className="panel-sigue__descripcion">{paso.descripcion}</p> : null}
      {contenido}
    </section>
  );
}

// ---------------------------------------------------------------------------

function Datos({ titulo, filas, vacio }: { titulo: string; filas: [string, string][]; vacio?: string }) {
  return (
    <section className="bloque">
      <h2>{titulo}</h2>
      {filas.length === 0 ? <p className="texto-secundario">{vacio}</p> : (
        <dl className="resumen">
          {filas.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function Bitacora({ solicitud }: { solicitud: SolicitudInterna }) {
  const eventos = [...solicitud.eventos].reverse();
  return (
    <section className="bloque">
      <h2>Bitácora</h2>
      <p className="texto-secundario">Cada paso y cada aviso automático quedan registrados.</p>
      <ol className="bitacora">
        {eventos.map((e, i) => (
          <li key={i} className={`en-cascada${e.autor === "Plataforma" ? " bitacora--plataforma" : ""}`} style={{ "--i": i + 2 } as React.CSSProperties}>
            <span className="bitacora__meta">{fechaHora(e.creadoEn)} · {e.autor}</span>
            {e.detalle}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function DetalleSolicitud() {
  const { id = "" } = useParams();
  const { hash } = useLocation();
  const [solicitud, setSolicitud] = useState<SolicitudInterna | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const avisar = useAviso();

  useEffect(() => {
    setSolicitud(null);
    Promise.all([obtenerSolicitudInterna(id), obtenerCatalogos()])
      .then(([s, c]) => { setSolicitud(s); setCatalogos(c); })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const cargada = solicitud !== null && catalogos !== null;
  useEffect(() => {
    if (cargada && hash === "#que-sigue") document.getElementById("que-sigue")?.scrollIntoView();
  }, [cargada, hash]);

  if (error) return <Aviso tipo="error"><p>{error}</p><p><Link to="/asesor/solicitudes">Volver a las solicitudes</Link></p></Aviso>;
  if (!solicitud || !catalogos) return <Esqueleto filas={3} alto={110} />;

  const s = solicitud;
  const elegida = s.ofertas.find((o) => o.id === s.aceptacion?.ofertaId);
  const recomendada = s.ofertas.find((o) => o.id === s.asesoria?.ofertaRecomendadaId);
  const asesorando = s.siguientePaso.codigo === "REGISTRAR_ASESORIA";

  function alGuardar(nueva: SolicitudInterna) {
    avisar(nueva.estado === "EMITIDA" ? "Póliza registrada. La solicitud quedó emitida." : "Asesoría guardada. El cliente ya la ve en su comparativo.");
    setSolicitud(nueva);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <p className="migas no-imprimir"><Link to="/asesor">Mi trabajo</Link> › <Link to="/asesor/solicitudes">Solicitudes</Link> › N.º {s.id}</p>
      <div className="cabecera-pagina">
        <h1>{s.tomador.nombre}</h1>
        <Estado estado={s.estado} />
      </div>
      <p className="detalle-meta">
        Solicitud N.º {s.id} · {nombreDe(catalogos.ramos, s.ramo)} · Recibida el {fechaHora(s.creadaEn)} · Asesor: {s.asesor ?? "sin asignar"}
      </p>

      <Recorrido solicitud={s} />

      <div className="detalle">
        <div className="detalle__principal">
          <PanelQueSigue solicitud={s} onCambio={alGuardar} />

          {s.ofertas.length > 0 && !asesorando ? (
            <section className="seccion">
              <h2 id="titulo-comparativo">Comparativo</h2>
              <Comparativo ofertas={s.ofertas} recomendadaId={s.asesoria?.ofertaRecomendadaId} paraAsesor />
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
        </div>

        <aside className="detalle__lateral">
          <Datos titulo="Tomador" filas={[
            ["Nombre", s.tomador.nombre],
            ["Documento", `${nombreDe(catalogos.tiposDocumento, s.tomador.tipoDocumento)} ${s.tomador.numeroDocumento}`],
            ["Correo", s.tomador.correo],
            ["Teléfono", s.tomador.telefono],
            ["Autorización de datos", `${fechaHora(s.autorizaDatosEn)}, versión ${s.autorizaDatosVersion}`],
          ]} />
          <Datos titulo="Datos del riesgo" filas={datosRiesgo(s.ramo, s.datosRamo, catalogos)} vacio="El cliente aún no los ha completado." />
          <Datos titulo="SARLAFT único" filas={datosSarlaft(s.sarlaft)} vacio="El cliente aún no lo ha completado." />
          <Bitacora solicitud={s} />
        </aside>
      </div>
    </>
  );
}
