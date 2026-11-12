import type { OfertaVista } from "../api/tipos";
import { pesos } from "../format/formato";
import "./Comparativo.css";

interface ComparativoProps {
  ofertas: OfertaVista[];
  seleccion?: { valor: number | null; onCambiar: (id: number) => void; error?: string };
  recomendadaId?: number | null;
}

export function Comparativo({ ofertas, seleccion, recomendadaId }: ComparativoProps) {
  const amparos = ofertas[0]?.coberturas ?? [];
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
                    {o.id === recomendadaId ? <span className="comparativo__nota">Recomendada por su asesor</span> : null}
                    {!seleccion && o.elegida ? <span className="comparativo__nota">Elegida por el cliente</span> : null}
                  </td>
                  <td className="comparativo__numero" data-etiqueta="Prima anual">{pesos(o.primaAnual)}</td>
                  <td data-etiqueta="Deducible">{o.deducible}</td>
                  <td data-etiqueta="Amparos incluidos">
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
      </p>
      {seleccion?.error ? <p className="campo__error" role="alert">{seleccion.error}</p> : null}
      {amparos.length > 0 ? (
        <>
          <h2>Qué cubre cada amparo</h2>
          <dl className="amparos">
            {amparos.map((c) => (
              <div key={c.codigo}>
                <dt>{c.nombre}</dt>
                <dd>{c.explicacion}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </>
  );
}
