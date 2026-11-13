import type { OfertaVista } from "../api/tipos";
import { pesos } from "../format/formato";
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
                <tr key={o.id} className={marcada ? "comparativo__fila--marcada" : undefined}>
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
