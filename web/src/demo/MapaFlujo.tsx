import type React from "react";
import { useEffect, useState } from "react";
import { Icono } from "../components/Icono";
import { ACTORES, ETAPAS } from "./flujo";
import "./Demo.css";

interface Props {
  etapa: number;
  onCambiar: (etapa: number) => void;
  autoplay?: boolean;
  compacto?: boolean;
}

/**
 * Matriz interactiva del proceso: columnas = etapas, filas = actores.
 * La celda se enciende cuando el actor participa en la etapa; un «sobre» recorre el flujo.
 */
export function MapaFlujo({ etapa, onCambiar, autoplay = false, compacto = false }: Props) {
  const [reproduciendo, setReproduciendo] = useState(autoplay);

  useEffect(() => {
    if (!reproduciendo) return;
    const turno = window.setTimeout(() => onCambiar(etapa >= ETAPAS.length ? 1 : etapa + 1), 4200);
    return () => window.clearTimeout(turno);
  }, [reproduciendo, etapa, onCambiar]);

  const actual = ETAPAS[etapa - 1];

  return (
    <div className={`mapa${compacto ? " mapa--compacto" : ""}`}>
      {!compacto ? (
        <div className="mapa__controles">
          <button type="button" className="boton boton--secundario boton--compacto" onClick={() => onCambiar(Math.max(1, etapa - 1))} disabled={etapa === 1} aria-label="Etapa anterior">
            <Icono nombre="atras" tamano={16} />
          </button>
          <button type="button" className="boton boton--principal boton--compacto" onClick={() => setReproduciendo((r) => !r)} aria-pressed={reproduciendo}>
            <Icono nombre={reproduciendo ? "pausa" : "play"} tamano={16} />{reproduciendo ? "Pausar" : "Reproducir el flujo"}
          </button>
          <button type="button" className="boton boton--secundario boton--compacto" onClick={() => onCambiar(Math.min(ETAPAS.length, etapa + 1))} disabled={etapa === ETAPAS.length} aria-label="Etapa siguiente">
            <Icono nombre="flecha" tamano={16} />
          </button>
          <span className="mapa__progreso" aria-hidden="true"><span key={`${etapa}-${reproduciendo}`} className={reproduciendo ? "mapa__progreso--corre" : ""} /></span>
          <span className="texto-secundario">Etapa {etapa} de {ETAPAS.length}</span>
        </div>
      ) : null}

      <div className="mapa__rejilla" role="table" aria-label="Quién hace qué en cada etapa del proceso" style={{ "--etapas": ETAPAS.length } as React.CSSProperties}>
        <div role="row" className="mapa__fila mapa__fila--cabecera">
          <span role="columnheader" className="mapa__esquina" />
          {ETAPAS.map((e) => (
            <button key={e.numero} type="button" role="columnheader" className={`mapa__etapa${e.numero === etapa ? " mapa__etapa--activa" : ""}${e.numero < etapa ? " mapa__etapa--hecha" : ""}`}
              onClick={() => onCambiar(e.numero)} aria-current={e.numero === etapa ? "step" : undefined} title={`${e.nombre} (${e.tareas})`}>
              <span className="mapa__num">{e.numero < etapa ? <Icono nombre="ok" tamano={14} /> : e.numero}</span>
              {!compacto ? <span className="mapa__etapa-nombre">{e.nombre}</span> : null}
            </button>
          ))}
        </div>
        {ACTORES.map((a) => (
          <div role="row" key={a.codigo} className="mapa__fila">
            <span role="rowheader" className="mapa__actor"><Icono nombre={a.icono} tamano={16} />{!compacto ? a.nombre : null}</span>
            {ETAPAS.map((e) => {
              const participa = Boolean(e.acciones[a.codigo]);
              const activa = e.numero === etapa && participa;
              return (
                <span role="cell" key={e.numero} className={`mapa__celda${participa ? " mapa__celda--participa" : ""}${activa ? " mapa__celda--activa" : ""}${e.numero === etapa ? " mapa__celda--columna" : ""}`}
                  title={participa ? `${a.nombre}: ${e.acciones[a.codigo]}` : undefined}>
                  {participa ? <span className="mapa__punto" /> : null}
                  {participa ? <span className="visualmente-oculto">{a.nombre} participa en {e.nombre}</span> : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {!compacto ? (
        <div className="mapa__detalle" key={etapa} aria-live="polite">
          <div className="mapa__detalle-cabecera">
            <span className="mapa__detalle-icono"><Icono nombre={actual.icono} tamano={26} /></span>
            <div>
              <p className="mapa__tareas">Etapa {actual.numero} · Tareas {actual.tareas}</p>
              <h3>{actual.nombre}</h3>
            </div>
          </div>
          <p>{actual.resumen}</p>
          <ul className="mapa__acciones">
            {ACTORES.filter((a) => actual.acciones[a.codigo]).map((a, i) => (
              <li key={a.codigo} className="en-cascada" style={{ "--i": i } as React.CSSProperties}>
                <span className={`mapa__chip mapa__chip--${a.codigo.toLowerCase()}`}><Icono nombre={a.icono} tamano={14} />{a.nombre}</span>
                {actual.acciones[a.codigo]}
              </li>
            ))}
          </ul>
          <p className="mapa__dato"><Icono nombre="estrella" tamano={16} /> {actual.dato}</p>
        </div>
      ) : null}
    </div>
  );
}
