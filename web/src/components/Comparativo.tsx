import type React from "react";
import type { OfertaVista } from "../api/tipos";
import { pesos } from "../format/formato";
import { Icono } from "./Icono";
import "./Comparativo.css";

interface ComparativoProps {
  ofertas: OfertaVista[];
  seleccion?: { valor: number | null; onCambiar: (id: number) => void; error?: string };
  recomendadaId?: number | null;
  /** Vista del asesor: marca los hechos objetivos del comparativo y pliega la explicación de los amparos. */
  paraAsesor?: boolean;
}

export function Comparativo({ ofertas, seleccion, recomendadaId, paraAsesor }: ComparativoProps) {
  const amparos = ofertas[0]?.coberturas ?? [];
  const menorPrima = Math.min(...ofertas.map((o) => o.primaAnual));
  const mayorPuntaje = Math.max(...ofertas.map((o) => o.puntajeCobertura));
  const explicacion = (
    <dl className="amparos">
      {amparos.map((c) => (
        <div key={c.codigo}>
          <dt>{c.nombre}</dt>
          <dd>{c.explicacion}</dd>
        </div>
      ))}
    </dl>
  );
  if (!paraAsesor) {
    return (
      <>
        <TarjetasOfertas ofertas={ofertas} seleccion={seleccion} recomendadaId={recomendadaId} menorPrima={menorPrima} mayorPuntaje={mayorPuntaje} />
        <p id="nota-orden" className="texto-secundario">Las ofertas están ordenadas por cobertura y, a igual cobertura, por menor prima.</p>
        {seleccion?.error ? <p className="campo__error" role="alert">{seleccion.error}</p> : null}
        {amparos.length > 0 ? (
          <details className="amparos-plegados amparos-plegados--cliente">
            <summary>Qué cubre cada amparo</summary>
            {explicacion}
          </details>
        ) : null}
      </>
    );
  }
  return (
    <>
      <div role={seleccion ? "radiogroup" : undefined} aria-labelledby={seleccion ? "titulo-comparativo" : undefined}>
        <table className="comparativo" aria-describedby="nota-orden">
          <thead>
            <tr>
              {seleccion ? <th className="comparativo__seleccion"><span className="visualmente-oculto">Elegir</span></th> : null}
              <th scope="col">Aseguradora</th>
              <th scope="col" className="comparativo__numero">Prima anual</th>
              <th scope="col">Deducible</th>
              <th scope="col">Amparos incluidos</th>
            </tr>
          </thead>
          <tbody>
            {ofertas.map((o) => {
              const incluidos = o.coberturas.filter((c) => c.incluida);
              const faltantes = o.coberturas.filter((c) => !c.incluida);
              const marcada = seleccion ? seleccion.valor === o.id : o.elegida;
              return (
                <tr key={o.id} className={marcada ? "comparativo__fila--marcada" : undefined} onClick={seleccion ? () => seleccion.onCambiar(o.id) : undefined}>
                  {seleccion ? (
                    <td className="comparativo__seleccion">
                      <input
                        type="radio"
                        name="oferta"
                        id={`oferta-${o.id}`}
                        checked={seleccion.valor === o.id}
                        onChange={() => seleccion.onCambiar(o.id)}
                        aria-label={`Elegir ${o.aseguradoraNombre}, prima anual ${pesos(o.primaAnual)}`}
                      />
                    </td>
                  ) : null}
                  <td className="comparativo__aseguradora" data-etiqueta="Aseguradora">
                    {seleccion ? <label htmlFor={`oferta-${o.id}`}>{o.aseguradoraNombre}</label> : o.aseguradoraNombre}
                    {paraAsesor && ofertas.length > 1 && o.puntajeCobertura === mayorPuntaje ? <span className="comparativo__insignia">Mayor cobertura</span> : null}
                    {paraAsesor && ofertas.length > 1 && o.primaAnual === menorPrima ? <span className="comparativo__insignia comparativo__insignia--prima">Menor prima</span> : null}
                    {o.id === recomendadaId ? <span className="comparativo__nota">{paraAsesor ? "Recomendada en la asesoría" : "Recomendada por su asesor"}</span> : null}
                    {!seleccion && o.elegida ? <span className="comparativo__nota">Elegida por el cliente</span> : null}
                  </td>
                  <td className="comparativo__numero" data-etiqueta="Prima anual">{pesos(o.primaAnual)}</td>
                  <td data-etiqueta="Deducible">{o.deducible}</td>
                  <td data-etiqueta="Amparos incluidos">
                    {paraAsesor ? <div className="comparativo__conteo">{incluidos.length} de {o.coberturas.length} amparos</div> : null}
                    <ul className="comparativo__amparos">
                      {incluidos.map((c) => <li key={c.codigo}>{c.nombre}</li>)}
                    </ul>
                    {faltantes.length > 0 ? (
                      <div className="comparativo__faltantes">No incluye: {faltantes.map((c) => c.nombre.toLowerCase()).join(", ")}.</div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p id="nota-orden" className="texto-secundario">
        Las ofertas están ordenadas por cobertura y, a igual cobertura, por menor prima.
        {paraAsesor ? " La comisión de la agencia no interviene en el orden ni se muestra." : ""}
      </p>
      {seleccion?.error ? <p className="campo__error" role="alert">{seleccion.error}</p> : null}
      {amparos.length > 0 && paraAsesor ? (
        <details className="amparos-plegados">
          <summary>Qué cubre cada amparo</summary>
          {explicacion}
        </details>
      ) : null}
      {amparos.length > 0 && !paraAsesor ? (
        <>
          <h2>Qué cubre cada amparo</h2>
          {explicacion}
        </>
      ) : null}
    </>
  );
}

const VACIAS = new Set(["aseguradora", "seguros", "compañía", "de", "del", "la", "el"]);
const iniciales = (nombre: string) => {
  const palabras = nombre.split(/\s+/).filter((p) => !VACIAS.has(p.toLowerCase()));
  return (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : (palabras[0] ?? nombre).slice(0, 2)).toUpperCase();
};

/** Vista del cliente: cada oferta es una tarjeta con medidor de cobertura y amparos marcados. */
function TarjetasOfertas({ ofertas, seleccion, recomendadaId, menorPrima, mayorPuntaje }: {
  ofertas: OfertaVista[];
  seleccion?: ComparativoProps["seleccion"];
  recomendadaId?: number | null;
  menorPrima: number;
  mayorPuntaje: number;
}) {
  return (
    <div className="ofertas" role={seleccion ? "radiogroup" : undefined} aria-labelledby={seleccion ? "titulo-comparativo" : undefined}>
      {ofertas.map((o, i) => {
        const incluidos = o.coberturas.filter((c) => c.incluida).length;
        const porcentaje = o.coberturas.length ? Math.round((incluidos / o.coberturas.length) * 100) : 0;
        const marcada = seleccion ? seleccion.valor === o.id : o.elegida;
        return (
          <article key={o.id} className={`oferta en-cascada${marcada ? " oferta--marcada" : ""}${i === 0 ? " oferta--primera" : ""}`}
            style={{ "--i": i } as React.CSSProperties} onClick={seleccion ? () => seleccion.onCambiar(o.id) : undefined}>
            {i === 0 ? <span className="oferta__cinta"><Icono nombre="estrella" tamano={13} />Primera del comparativo</span> : null}
            <header className="oferta__cabecera">
              <span className="oferta__logo" aria-hidden="true">{iniciales(o.aseguradoraNombre)}</span>
              <div>
                <h3 className="oferta__nombre">
                  {seleccion ? <label htmlFor={`oferta-${o.id}`}>{o.aseguradoraNombre}</label> : o.aseguradoraNombre}
                </h3>
                <span className="oferta__puesto">Puesto {i + 1} de {ofertas.length}</span>
              </div>
              {seleccion ? (
                <input type="radio" name="oferta" id={`oferta-${o.id}`} className="oferta__radio" checked={seleccion.valor === o.id}
                  onChange={() => seleccion.onCambiar(o.id)} onClick={(e) => e.stopPropagation()}
                  aria-label={`Elegir ${o.aseguradoraNombre}, prima anual ${pesos(o.primaAnual)}`} />
              ) : null}
            </header>
            <p className="oferta__precio">{pesos(o.primaAnual)}<span> / año</span></p>
            <p className="oferta__mensual">≈ {pesos(o.primaAnual / 12)} al mes</p>
            <div className="oferta__insignias">
              {ofertas.length > 1 && o.puntajeCobertura === mayorPuntaje ? <span className="insignia insignia--azul">Mayor cobertura</span> : null}
              {ofertas.length > 1 && o.primaAnual === menorPrima ? <span className="insignia insignia--roja">Menor precio</span> : null}
              {o.id === recomendadaId ? <span className="insignia insignia--verde">Recomendada por su asesor</span> : null}
              {!seleccion && o.elegida ? <span className="insignia insignia--verde">Elegida</span> : null}
            </div>
            <div className="oferta__medidor" aria-label={`Cobertura: ${incluidos} de ${o.coberturas.length} amparos`}>
              <span className="oferta__medidor-texto"><strong>{incluidos}</strong> de {o.coberturas.length} amparos</span>
              <span className="oferta__barra"><span style={{ width: `${porcentaje}%` }} /></span>
            </div>
            <ul className="oferta__amparos">
              {o.coberturas.map((c) => (
                <li key={c.codigo} className={c.incluida ? "oferta__amparo" : "oferta__amparo oferta__amparo--no"} title={c.explicacion}>
                  <Icono nombre={c.incluida ? "ok" : "cerrar"} tamano={14} />{c.nombre}
                  <span className="visualmente-oculto">{c.incluida ? " (incluido)" : " (no incluido)"}</span>
                </li>
              ))}
            </ul>
            <p className="oferta__deducible"><strong>Deducible:</strong> {o.deducible}</p>
          </article>
        );
      })}
    </div>
  );
}
