import type React from "react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import type { ErrorApi, Errores } from "../../api/http";
import { cerrarSiniestro, guardarAsesoria, obtenerSolicitudInterna, radicarSiniestro, registrarContacto, responderPqr } from "../../api/interno";
import type { Catalogos, PqrVista, SiniestroVista, SolicitudInterna } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { useAviso } from "../../components/Avisos";
import { AreaTexto, Campo, Opciones } from "../../components/Campo";
import { Comparativo } from "../../components/Comparativo";
import { Esqueleto } from "../../components/Esqueleto";
import { Estado } from "../../components/Estado";
import { Icono } from "../../components/Icono";
import { useSesion } from "../../sesion/Sesion";
import { aNumero, conMiles, fecha, fechaHora, hace, pesos } from "../../format/formato";
import { datosRiesgo, datosSarlaft } from "./datosRiesgo";
import "./Asesor.css";

const CRITERIO_MINIMO = 30;

type AlGuardar = (s: SolicitudInterna) => void;

// ---------------------------------------------------------------------------
// Recorrido del proceso: muestra en qué paso va la solicitud y quién hace cada uno.

type EstadoPaso = "hecho" | "actual" | "pendiente" | "omitido";

function pasosDelProceso(s: SolicitudInterna): { nombre: string; quien: string; tarea: string; estado: EstadoPaso; nota?: string }[] {
  const conDatos = !["NUEVA", "CERRADA", "EN_CUMPLIMIENTO"].includes(s.estado);
  const aceptada = s.estado === "ACEPTADA" || s.estado === "EMITIDA";
  const emitida = s.estado === "EMITIDA";
  // Las siete etapas siguen la matriz del proceso TO-BE.
  const hechos = [true, conDatos, conDatos, Boolean(s.asesoria), aceptada, emitida, emitida];
  const detenida = ["NO_INTERESADA", "CERRADA", "EN_CUMPLIMIENTO"].includes(s.estado);
  const actual = detenida ? -1 : hechos.findIndex((h, i) => !h && !(i === 3 && aceptada));
  const etapas = [
    ["Solicitud", "Cliente y plataforma", "T01–T02"],
    ["SARLAFT y datos", "Cliente", "T03–T07"],
    ["Cotización", "Plataforma", "T08"],
    ["Asesoría", "Asesor", "T09"],
    ["Aceptación y firma", "Cliente", "T10"],
    ["Suscripción y pago", "Aseguradora y cliente", "T11–T12"],
    ["Póliza", "Aseguradora y plataforma", "T13–T14"],
  ];
  return etapas.map(([nombre, quien, tarea], i) => {
    if (hechos[i]) return { nombre, quien, tarea, estado: "hecho" };
    if (i === 3 && aceptada) return { nombre, quien, tarea, estado: "omitido", nota: "Sin asesoría registrada" };
    return { nombre, quien, tarea, estado: i === actual ? "actual" : "pendiente" };
  });
}

function Recorrido({ solicitud }: { solicitud: SolicitudInterna }) {
  const pasos = pasosDelProceso(solicitud);
  const detenida = { NO_INTERESADA: "El cliente no continuó", CERRADA: "Cerrada por datos incompletos", EN_CUMPLIMIENTO: "Escalada a cumplimiento por listas restrictivas" }[solicitud.estado as string] ?? "";
  return (
    <>
      <ol className="recorrido" aria-label="Avance de la solicitud">
        {pasos.map((p, i) => (
          <li key={p.nombre} title={`Tareas ${p.tarea} de la matriz`} className={`recorrido__paso recorrido__paso--${p.estado} en-cascada`} style={{ "--i": i } as React.CSSProperties} aria-current={p.estado === "actual" ? "step" : undefined}>
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

  async function copiarMensaje() {
    await navigator.clipboard?.writeText(texto).catch(() => undefined);
    avisar("Mensaje copiado. Péguelo en WhatsApp o en el canal que use con el cliente.");
  }

  async function copiar() {
    await navigator.clipboard?.writeText(enlace).catch(() => undefined);
    setCopiado(true);
    avisar("Enlace copiado. Ya puede pegarlo en el mensaje al cliente.");
  }

  return (
    <div className="contacto no-imprimir">
      <div className="contacto__acciones">
        <a className="boton boton--principal" href={`tel:${telefono}`}><Icono nombre="telefono" tamano={17} />Llamar al {telefono}</a>
        <Boton onClick={copiarMensaje}>Copiar mensaje para WhatsApp</Boton>
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

/** T07: el contacto con el cliente queda registrado en la solicitud. */
function RegistroContacto({ solicitud, onGuardado }: { solicitud: SolicitudInterna; onGuardado: AlGuardar }) {
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const avisar = useAviso();

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const nueva = await registrarContacto(solicitud.id, nota);
      setNota("");
      avisar("Contacto registrado en la bitácora de la solicitud.");
      onGuardado(nueva);
    } catch (e) {
      const err = e as ErrorApi;
      setError(err.errores?.nota ?? err.message);
    }
    setEnviando(false);
  }

  return (
    <form className="registro-contacto" onSubmit={guardar} noValidate>
      <AreaTexto id="nota" etiqueta="Registrar el contacto" ayuda="Qué se habló con el cliente y qué quedó pendiente." value={nota}
        onChange={(e) => setNota(e.target.value)} error={error} maxLength={500} rows={2} />
      <Boton type="submit" disabled={enviando}>Guardar contacto</Boton>
    </form>
  );
}

const RESULTADOS = [{ codigo: "PAGADO", nombre: "Pagado" }, { codigo: "OBJETADO", nombre: "Objetado" }];

/** T16: radicar la reclamación y, al cierre, registrar resultado y valor pagado. */
function CasoSiniestro({ siniestro, solicitud, catalogos, onCambio }: { siniestro: SiniestroVista; solicitud: SolicitudInterna; catalogos: Catalogos; onCambio: AlGuardar }) {
  const [resultado, setResultado] = useState("");
  const [valor, setValor] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const avisar = useAviso();
  const lista = catalogos.documentosSiniestro[solicitud.ramo];
  const adjuntos = lista.filter((d) => siniestro.documentos?.includes(d.codigo)).map((d) => d.nombre.toLowerCase());

  async function ejecutar(accion: () => Promise<SolicitudInterna>, confirmacion: string) {
    setEnviando(true);
    setMensaje("");
    setErrores({});
    try {
      const nueva = await accion();
      avisar(confirmacion);
      onCambio(nueva);
    } catch (e) {
      const err = e as ErrorApi;
      setErrores(err.errores ?? {});
      if (!err.errores || Object.keys(err.errores).length === 0) setMensaje(err.message);
    }
    setEnviando(false);
  }

  function cerrar(evento: FormEvent) {
    evento.preventDefault();
    const valorPagado = aNumero(valor);
    void ejecutar(() => cerrarSiniestro(siniestro.id, { resultado: resultado || undefined, valorPagado: Number.isNaN(valorPagado) ? undefined : valorPagado }), "Siniestro cerrado. El resultado ya alimenta el tablero.");
  }

  return (
    <article className="caso">
      <h3>Siniestro del {fecha(siniestro.fechaEvento ?? siniestro.fechaReporte)}{siniestro.lugar ? `, ${siniestro.lugar}` : ""}</h3>
      <p>{siniestro.descripcion}</p>
      <p className="texto-secundario">
        Reportado {hace(siniestro.fechaReporte)}. Documentos: {adjuntos.length > 0 ? adjuntos.join("; ") : "sin lista"}.
        {siniestro.radicadoEn ? ` Radicado el ${fechaHora(siniestro.radicadoEn)}.` : ""}
      </p>
      {siniestro.avisoTardio ? <Aviso tipo="alerta"><p>El aviso llegó más de tres días después del evento (art. 1075 C. Co.). Revíselo con la aseguradora.</p></Aviso> : null}
      {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}

      {siniestro.estado === "REPORTADO" ? (
        <>
          <p><span className="numero-paso">1</span> La reclamación llegó completa: radíquela ante la aseguradora.</p>
          <Boton variante="principal" disabled={enviando} onClick={() => ejecutar(() => radicarSiniestro(siniestro.id), "Reclamación radicada ante la aseguradora.")}>Radicar la reclamación</Boton>
        </>
      ) : (
        <form onSubmit={cerrar} noValidate>
          <p><span className="numero-paso">2</span> Haga seguimiento con la aseguradora y, cuando responda, cierre el caso.</p>
          <Opciones id={`resultado-${siniestro.id}`} etiqueta="Resultado" valor={resultado} opciones={RESULTADOS} onCambiar={setResultado} error={errores.resultado} />
          {resultado === "PAGADO" ? (
            <Campo id={`valor-${siniestro.id}`} etiqueta="Valor pagado" ayuda="En pesos" inputMode="numeric" value={valor}
              onChange={(e) => setValor(conMiles(e.target.value))} error={errores.valorPagado} />
          ) : null}
          <Boton type="submit" variante="principal" disabled={enviando}>Cerrar el siniestro</Boton>
        </form>
      )}
    </article>
  );
}

function CasoPqr({ pqr, catalogos, onCambio }: { pqr: PqrVista; catalogos: Catalogos; onCambio: AlGuardar }) {
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const avisar = useAviso();

  async function responder(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const nueva = await responderPqr(pqr.id, respuesta);
      avisar("PQR respondida y cerrada.");
      onCambio(nueva);
    } catch (e) {
      const err = e as ErrorApi;
      setError(err.errores?.respuesta ?? err.message);
    }
    setEnviando(false);
  }

  return (
    <article className="caso">
      <h3>{nombreDe(catalogos.tiposPqr, pqr.tipo)} del {fecha(pqr.fecha)}</h3>
      <p>{pqr.descripcion ?? pqr.asunto}</p>
      <form onSubmit={responder} noValidate>
        <AreaTexto id={`respuesta-${pqr.id}`} etiqueta="Respuesta al cliente" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} error={error} maxLength={1000} rows={3} />
        <Boton type="submit" variante="principal" disabled={enviando}>Responder y cerrar</Boton>
      </form>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Panel «Qué sigue»: una sola acción a la vez, deducida del estado de la solicitud.

function PanelQueSigue({ solicitud, catalogos, onCambio }: { solicitud: SolicitudInterna; catalogos: Catalogos; onCambio: AlGuardar }) {
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
    case "ATENDER_CASO":
      contenido = (
        <>
          {s.siniestros.filter((x) => x.estado !== "CERRADO").map((x) => <CasoSiniestro key={x.id} siniestro={x} solicitud={s} catalogos={catalogos} onCambio={onCambio} />)}
          {s.pqrs.filter((x) => x.estado !== "CERRADA").map((x) => <CasoPqr key={x.id} pqr={x} catalogos={catalogos} onCambio={onCambio} />)}
          <Contacto solicitud={s} mensaje={`Hola, ${nombre}. ${firma} Ya estoy gestionando su caso; puede ver el avance aquí:`} />
        </>
      );
      break;
    case "ESPERAR_CONDICIONES":
    case "ESPERAR_PAGO": {
      const sus = s.aceptacion?.suscripcion;
      contenido = (
        <>
          {sus ? <p className="oferta-aceptada"><strong>{sus.revision}:</strong> {sus.detalle}</p> : null}
          <p className="texto-secundario">En esta etapa usted no digita nada: la aseguradora suscribe y emite, y la plataforma entrega la póliza y registra la venta.</p>
          <Contacto solicitud={s} mensaje={`Hola, ${nombre}. ${firma} La aseguradora ya respondió su solicitud. Puede revisar la respuesta y hacer el pago aquí:`} />
        </>
      );
      break;
    }
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
          <p className="no-imprimir">
            <Link className="boton boton--secundario" to={`/solicitud/${s.token}`}>Completar los datos con el cliente</Link>
          </p>
          {paso.codigo === "CONTACTAR_CLIENTE" ? <RegistroContacto solicitud={s} onGuardado={onCambio} /> : null}
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
    case "ESPERAR_RENOVACION":
    case "LLAMAR_RENOVACION":
      contenido = <p><Link className="boton boton--principal" to="/asesor/renovaciones">Ver la propuesta de renovación</Link></p>;
      break;
    default:
      contenido = null;
  }

  return (
    <section id="que-sigue" key={paso.codigo} className={`panel-sigue panel-sigue--${paso.responsable.toLowerCase()} pagina`} aria-labelledby="titulo-sigue">
      <p className="panel-sigue__quien">Qué sigue · {quien}{paso.tarea ? <span className="panel-sigue__tarea" title="Tarea de la matriz TO-BE">{paso.tarea}</span> : null}</p>
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
    if (nueva.asesoria && !solicitud?.asesoria) {
      avisar("Asesoría guardada. El cliente ya la ve en su comparativo.");
      window.scrollTo(0, 0);
    }
    setSolicitud(nueva);
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
          <PanelQueSigue solicitud={s} catalogos={catalogos} onCambio={alGuardar} />

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

          {s.aceptacion?.suscripcion ? (
            <section className="seccion">
              <h2>Suscripción de la aseguradora</h2>
              <dl className="resumen">
                <dt>{s.aceptacion.suscripcion.revision}</dt>
                <dd>{s.aceptacion.suscripcion.detalle}</dd>
                <dt>Resultado</dt>
                <dd>
                  {s.aceptacion.suscripcion.resultado === "ESTANDAR" ? "Condiciones estándar" : "Con condiciones"}, {fechaHora(s.aceptacion.suscripcion.suscritaEn)}
                  {s.aceptacion.suscripcion.condicionesAceptadasEn ? ` · aceptadas por el cliente el ${fechaHora(s.aceptacion.suscripcion.condicionesAceptadasEn)}` : ""}
                </dd>
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
                {s.poliza.pagadaEn ? (<><dt>Pago</dt><dd>{nombreDe(catalogos.formasPago, s.poliza.formaPago)}, {fecha(s.poliza.pagadaEn)}</dd></>) : null}
                {s.renovacion?.decision ? (
                  <>
                    <dt>Renovación</dt>
                    <dd>
                      {s.renovacion.decision === "RENOVADA"
                        ? `Renovada con ${s.renovacion.aseguradoraElegida}, ${pesos(s.renovacion.primaElegida ?? 0)}`
                        : `No renovada: ${nombreDe(catalogos.motivosNoRenovacion, s.renovacion.motivoNoRenovacion).toLowerCase()}`}
                    </dd>
                  </>
                ) : null}
              </dl>
            </section>
          ) : null}

          {s.siniestros.length + s.pqrs.length > 0 ? (
            <section className="seccion">
              <h2>Siniestros y PQR</h2>
              <ul className="historial-casos">
                {s.siniestros.map((x) => (
                  <li key={`s${x.id}`}>
                    <strong>Siniestro del {fecha(x.fechaEvento ?? x.fechaReporte)}</strong> · {x.descripcion}
                    <span className="texto-secundario">
                      {x.estado === "CERRADO"
                        ? ` Cerrado${x.cerradoEn ? ` el ${fecha(x.cerradoEn)}` : ""}: ${x.resultado === "PAGADO" ? `pagado por ${pesos(x.valorPagado ?? 0)}` : "objetado"}.`
                        : x.estado === "RADICADO" ? " Radicado, en seguimiento." : " Por radicar."}
                    </span>
                  </li>
                ))}
                {s.pqrs.map((x) => (
                  <li key={`p${x.id}`}>
                    <strong>{nombreDe(catalogos.tiposPqr, x.tipo)} del {fecha(x.fecha)}</strong> · {x.descripcion ?? x.asunto}
                    <span className="texto-secundario">{x.estado === "CERRADA" ? ` Respondida: ${x.respuesta}` : " Por responder."}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="detalle__lateral">
          <Datos titulo="Tomador" filas={[
            ["Nombre", s.tomador.nombre],
            ["Documento", `${nombreDe(catalogos.tiposDocumento, s.tomador.tipoDocumento)} ${s.tomador.numeroDocumento}`],
            ["Correo", s.tomador.correo],
            ["Teléfono", s.tomador.telefono],
            ...(s.tomador.ciudad ? [["Ciudad", nombreDe(catalogos.ciudades, s.tomador.ciudad)] as [string, string]] : []),
            ["Clasificación", `Persona ${s.clasificacion.tipoCliente === "JURIDICA" ? "jurídica" : "natural"}, ${s.clasificacion.tramite === "RENOVACION" ? "renovación" : "póliza nueva"}`],
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
