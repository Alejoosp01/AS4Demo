import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import { type Resumen, type TareaResumen, obtenerResumen } from "../../api/interno";
import type { Catalogos } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Esqueleto } from "../../components/Esqueleto";
import { Icono, type NombreIcono } from "../../components/Icono";
import { useConteo } from "../../hooks/useConteo";
import { useSesion } from "../../sesion/Sesion";
import "./Asesor.css";

// Las siete etapas del proceso TO-BE y quién hace cada una.
const PROCESO = [
  { quien: "Cliente", que: "Solicitud con autorización de datos; la plataforma la clasifica (T01–T02)." },
  { quien: "Cliente", que: "SARLAFT único y datos del ramo, una sola vez. Usted solo llama si se detiene 48 horas (T03–T07)." },
  { quien: "Plataforma", que: "Cotiza con las aliadas y ordena por cobertura y precio (T08)." },
  { quien: "Usted", que: "Asesora y deja escrito el criterio; el cliente acepta y firma en línea (T09–T10)." },
  { quien: "Aseguradora", que: "Suscribe y emite; el cliente paga y la plataforma entrega la póliza (T11–T14)." },
  { quien: "Usted", que: "Radica y acompaña los siniestros y las PQR hasta el cierre (T15–T16)." },
  { quien: "Plataforma", que: "Recotiza la renovación 30 días antes; el cliente decide en su enlace (T15–T17)." },
];

const ICONOS: Record<string, NombreIcono> = {
  ATENDER_CASO: "escudo",
  REGISTRAR_ASESORIA: "asesoria",
  CONTACTAR_CLIENTE: "telefono",
  LLAMAR_RENOVACION: "renovar",
};

/** Indicador de una tarea: lleva al bloque correspondiente de la lista. */
function Indicador({ tarea, orden }: { tarea: TareaResumen; orden: number }) {
  const total = useConteo(tarea.total);
  const contenido = (
    <>
      <span className="indicador__icono"><Icono nombre={ICONOS[tarea.codigo] ?? "lista"} tamano={22} /></span>
      <span className="indicador__total">{total}</span>
      <span className="indicador__nombre">{tarea.titulo}</span>
    </>
  );
  const estilo = { "--i": orden } as React.CSSProperties;
  return tarea.total > 0
    ? <a className="indicador en-cascada" style={estilo} href={`#bloque-${tarea.codigo}`}>{contenido}</a>
    : <div className="indicador indicador--al-dia en-cascada" style={estilo}>{contenido}</div>;
}

function saludo(): string {
  const hora = new Date().getHours();
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

function destino(tarea: TareaResumen, solicitudId: number): string {
  return tarea.codigo === "LLAMAR_RENOVACION" ? "/asesor/renovaciones" : `/asesor/solicitudes/${solicitudId}#que-sigue`;
}

function Tarea({ tarea, orden, catalogos }: { tarea: TareaResumen; orden: number; catalogos: Catalogos | null }) {
  const verTodas = tarea.codigo === "LLAMAR_RENOVACION" ? "/asesor/renovaciones" : `/asesor/solicitudes?${tarea.filtro}`;
  return (
    <section className="tarea en-cascada" id={`bloque-${tarea.codigo}`} style={{ "--i": orden + 3 } as React.CSSProperties} aria-labelledby={`tarea-${tarea.codigo}`}>
      <header className="tarea__cabecera">
        <span className="tarea__orden" aria-hidden="true">{orden}</span>
        <div>
          <h2 id={`tarea-${tarea.codigo}`}>{tarea.titulo} <span className="tarea__total">{tarea.total}</span> <span className="tarea__codigo" title="Tarea de la matriz TO-BE">{tarea.tarea}</span></h2>
          <p className="texto-secundario">{tarea.porque}</p>
        </div>
      </header>
      <ul className="tarea__lista">
        {tarea.elementos.map((e) => (
          <li key={e.solicitudId}>
            <div className="tarea__quien">
              <strong>{e.nombre}</strong>
              <span className="texto-secundario">
                {catalogos ? nombreDe(catalogos.ramos, e.ramo) : e.ramo} · {e.detalle}
              </span>
            </div>
            {e.urgente ? <span className="etiqueta etiqueta--urgente">Prioridad</span> : null}
            <Link className="boton boton--principal boton--compacto" to={destino(tarea, e.solicitudId)}
              aria-label={`${tarea.accion}: ${e.nombre}`}>
              {tarea.accion}<Icono nombre="flecha" tamano={15} />
            </Link>
          </li>
        ))}
      </ul>
      {tarea.total > tarea.elementos.length ? (
        <p className="tarea__mas"><Link to={verTodas}>Ver las {tarea.total}</Link></p>
      ) : null}
    </section>
  );
}

export function Inicio() {
  const { usuario } = useSesion();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerResumen().then(setResumen).catch((e: Error) => setError(e.message));
    obtenerCatalogos().then(setCatalogos).catch(() => undefined);
  }, []);

  const conTrabajo = resumen?.tareas.filter((t) => t.total > 0) ?? [];
  const alDia = resumen?.tareas.filter((t) => t.total === 0) ?? [];
  const nombre = usuario?.nombre.split(" ")[0] ?? "";

  return (
    <div className="inicio">
      <div className="inicio__principal">
        <h1>{saludo()}, {nombre}</h1>
        {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}
        {!resumen && !error ? <Esqueleto filas={3} alto={150} /> : null}

        {resumen ? (
          <>
            <p className="inicio__resumen" aria-live="polite">
              {resumen.totalPendientes === 0
                ? "No tiene tareas pendientes. La plataforma le avisará aquí cuando un cliente lo necesite."
                : `Tiene ${resumen.totalPendientes} ${resumen.totalPendientes === 1 ? "tarea pendiente" : "tareas pendientes"}. Están en orden de prioridad: empiece por la primera.`}
            </p>

            <div className="indicadores">
              {resumen.tareas.map((t, i) => <Indicador key={t.codigo} tarea={t} orden={i} />)}
            </div>

            {conTrabajo.map((t, i) => <Tarea key={t.codigo} tarea={t} orden={i + 1} catalogos={catalogos} />)}

            {alDia.length > 0 && conTrabajo.length > 0 ? (
              <p className="inicio__al-dia">Al día: {alDia.map((t) => t.titulo.toLowerCase()).join(", ")}.</p>
            ) : null}

            <p className="inicio__espera">
              <strong>{resumen.esperandoCliente}</strong> {resumen.esperandoCliente === 1 ? "solicitud espera" : "solicitudes esperan"} una respuesta del cliente.
              No requieren acción suya por ahora. <Link to="/asesor/solicitudes?tarea=cliente&asignacion=mias">Verlas</Link>
            </p>
          </>
        ) : null}
      </div>

      <aside className="inicio__lateral" aria-labelledby="titulo-proceso">
        <h2 id="titulo-proceso">Cómo avanza una solicitud</h2>
        <ol className="proceso-resumen">
          {PROCESO.map((p, i) => (
            <li key={i} className={p.quien === "Usted" ? "proceso-resumen__suyo" : undefined}>
              <span className="proceso-resumen__quien">{p.quien}</span>
              {p.que}
            </li>
          ))}
        </ol>
        <p className="texto-secundario">
          De las 27 tareas del proceso, solo tres quedan a su cargo: asesorar, acompañar siniestros y destrabar al cliente cuando lo necesita.
        </p>
      </aside>
    </div>
  );
}
