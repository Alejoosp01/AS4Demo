import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import { type Renovacion, obtenerRenovacionesGerencia } from "../../api/interno";
import type { Catalogos } from "../../api/tipos";
import { textoDias, urgencia } from "../../components/AlertaRenovaciones";
import { Aviso } from "../../components/Aviso";
import { Esqueleto } from "../../components/Esqueleto";
import { fecha, pesos, variacion } from "../../format/formato";
import { useConteo } from "../../hooks/useConteo";
import "../../components/Grafica.css";
import "../../components/Tabla.css";
import "../asesor/Asesor.css";
import "./Vencimientos.css";

type Filtro = "todas" | "critica" | "proxima" | "llamar";

const FILTROS: { codigo: Filtro; nombre: string }[] = [
  { codigo: "todas", nombre: "Todas" },
  { codigo: "critica", nombre: "7 días o menos" },
  { codigo: "proxima", nombre: "8 a 15 días" },
  { codigo: "llamar", nombre: "Sin respuesta" },
];

function Cifra({ valor, texto, clase, formato }: { valor: number; texto: string; clase?: string; formato?: (n: number) => string }) {
  const n = useConteo(valor);
  return <div className={`venc__cifra ${clase ?? ""}`}><strong>{formato ? formato(n) : n}</strong><span>{texto}</span></div>;
}

/** Gerencia (T17): cartera por renovarse en los próximos 30 días, con línea de tiempo y estado de cada propuesta. */
export function Vencimientos() {
  const [lista, setLista] = useState<Renovacion[] | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [resaltada, setResaltada] = useState<number | null>(null);

  useEffect(() => {
    obtenerRenovacionesGerencia().then(setLista).catch((e: Error) => setError(e.message));
    obtenerCatalogos().then(setCatalogos).catch(() => undefined);
  }, []);

  const visibles = useMemo(() => (lista ?? []).filter((r) =>
    filtro === "todas" ? true : filtro === "llamar" ? r.propuesta?.sinRespuesta : urgencia(r.diasRestantes) === filtro), [lista, filtro]);

  const prima = (lista ?? []).reduce((t, r) => t + r.primaAnual, 0);
  const criticas = (lista ?? []).filter((r) => r.diasRestantes <= 7).length;
  const llamar = (lista ?? []).filter((r) => r.propuesta?.sinRespuesta).length;

  return (
    <>
      <h1>Vencimientos de la cartera</h1>
      <p className="texto-secundario pagina__intro" style={{ maxWidth: 780 }}>
        Pólizas que vencen en los próximos 30 días. La plataforma las recotiza sola (T15), el cliente decide en su enlace (T16) y el asesor
        solo llama cuando pasan cinco días sin respuesta. Esta vista es de consulta: la decisión no la toma gerencia.
      </p>
      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}
      {!lista && !error ? <Esqueleto filas={3} alto={120} /> : null}
      {lista && lista.length === 0 ? <Aviso><p>No hay pólizas por vencer en los próximos 30 días.</p></Aviso> : null}

      {lista && lista.length > 0 ? (
        <>
          <div className="venc__cifras">
            <Cifra valor={lista.length} texto="pólizas por vencer" />
            <Cifra valor={criticas} texto="vencen en 7 días o menos" clase="venc__cifra--critica" />
            <Cifra valor={llamar} texto="sin respuesta del cliente" clase="venc__cifra--llamar" />
            <Cifra valor={prima} texto="prima anual en juego" formato={pesos} />
          </div>

          <section className="panel venc__linea" aria-labelledby="titulo-linea">
            <h2 id="titulo-linea">Línea de tiempo</h2>
            <p className="texto-secundario">Cada punto es una póliza. Pase el cursor o el foco por un punto para ver el detalle.</p>
            <div className="venc__eje" role="list">
              <span className="venc__zona venc__zona--critica" style={{ width: `${(7 / 30) * 100}%` }} aria-hidden="true" />
              <span className="venc__zona venc__zona--proxima" style={{ left: `${(7 / 30) * 100}%`, width: `${(8 / 30) * 100}%` }} aria-hidden="true" />
              {lista.map((r, i) => (
                <button key={r.id} type="button" role="listitem" className={`venc__punto venc__punto--${urgencia(r.diasRestantes)}${resaltada === r.id ? " venc__punto--activo" : ""}`}
                  style={{ left: `${(Math.max(0, r.diasRestantes) / 30) * 100}%`, top: `${18 + (i % 3) * 16}px`, "--i": i } as React.CSSProperties}
                  onMouseEnter={() => setResaltada(r.id)} onFocus={() => setResaltada(r.id)} onMouseLeave={() => setResaltada(null)}
                  onClick={() => document.getElementById(`venc-${r.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  aria-label={`${r.tomador}, ${textoDias(r.diasRestantes)}`}>
                  {resaltada === r.id ? <span className="venc__globo">{r.tomador}<br />{textoDias(r.diasRestantes)}</span> : null}
                </button>
              ))}
            </div>
            <div className="venc__marcas" aria-hidden="true"><span>Hoy</span><span>7 días</span><span>15 días</span><span>30 días</span></div>
          </section>

          <div className="filtro-tareas venc__filtros" role="group" aria-label="Filtrar por urgencia">
            {FILTROS.map((f) => (
              <button key={f.codigo} type="button" className={`ficha${filtro === f.codigo ? " ficha--activa" : ""}`} aria-pressed={filtro === f.codigo} onClick={() => setFiltro(f.codigo)}>
                {f.nombre}
              </button>
            ))}
          </div>

          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Tomador</th>
                  <th scope="col">Ramo</th>
                  <th scope="col">Aseguradora actual</th>
                  <th scope="col" className="numero">Prima</th>
                  <th scope="col">Vence</th>
                  <th scope="col">Propuesta</th>
                  <th scope="col">Asesor</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => {
                  const actual = r.propuesta?.ofertas.find((o) => o.esActual);
                  return (
                    <tr key={r.id} id={`venc-${r.id}`} className={resaltada === r.id ? "fila-actual" : undefined}
                      onMouseEnter={() => setResaltada(r.id)} onMouseLeave={() => setResaltada(null)}>
                      <td><strong>{r.tomador}</strong><br /><span className="texto-secundario">{r.numero}</span></td>
                      <td>{catalogos ? nombreDe(catalogos.ramos, r.ramo) : r.ramo}</td>
                      <td>{r.aseguradora}</td>
                      <td className="numero">{pesos(r.primaAnual)}{actual ? <><br /><span className="texto-secundario">{variacion(r.primaAnual, actual.primaAnual)}</span></> : null}</td>
                      <td><span className={`etiqueta${r.diasRestantes <= 7 ? " etiqueta--urgente" : ""}`}>{fecha(r.fechaVencimiento)} · {textoDias(r.diasRestantes)}</span></td>
                      <td>{!r.propuesta ? "Pendiente de recotizar" : r.propuesta.sinRespuesta ? "Sin respuesta: el asesor llama" : "Enviada, esperando al cliente"}</td>
                      <td>{r.asesor ?? "Sin asignar"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibles.length === 0 ? <p className="texto-secundario">No hay pólizas con este filtro.</p> : null}
        </>
      ) : null}
    </>
  );
}
