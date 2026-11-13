import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import { type Renovacion, marcarRenovacion, obtenerRenovaciones } from "../../api/interno";
import type { Catalogos } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { useAviso } from "../../components/Avisos";
import { Boton } from "../../components/Boton";
import { Esqueleto } from "../../components/Esqueleto";
import { Icono } from "../../components/Icono";
import { fecha, pesos, variacion } from "../../format/formato";
import "../../components/Tabla.css";
import "./Asesor.css";

function Propuesta({ r }: { r: Renovacion }) {
  if (!r.propuesta) {
    return <p className="texto-secundario">La plataforma aún no ha recotizado esta póliza. Lo hace de forma automática en el siguiente ciclo de seguimiento.</p>;
  }
  const { ofertas } = r.propuesta;
  const actual = ofertas.find((o) => o.esActual);
  const mejor = ofertas[0];
  return (
    <>
      <ul className="renovacion__hallazgos">
        <li>
          {actual
            ? <>Renovar con <strong>{actual.aseguradoraNombre}</strong> costaría {pesos(actual.primaAnual)} al año ({variacion(r.primaAnual, actual.primaAnual)} frente a la prima actual).</>
            : <><strong>{r.aseguradora}</strong> no ofrece renovación para este riesgo en la nueva vigencia.</>}
        </li>
        {mejor && !mejor.esActual ? (
          <li>
            La primera del comparativo es <strong>{mejor.aseguradoraNombre}</strong>: {mejor.amparosIncluidos} de {mejor.amparosTotales} amparos por {pesos(mejor.primaAnual)}.
          </li>
        ) : null}
        {mejor?.esActual ? <li>La aseguradora actual sigue siendo la primera del comparativo.</li> : null}
      </ul>
      <details>
        <summary>Ver la recotización completa ({ofertas.length} ofertas)</summary>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Aseguradora</th>
                <th scope="col" className="numero">Prima anual</th>
                <th scope="col" className="numero">Frente a la actual</th>
                <th scope="col">Amparos</th>
                <th scope="col">Deducible</th>
              </tr>
            </thead>
            <tbody>
              {ofertas.map((o) => (
                <tr key={o.aseguradoraNombre} className={o.esActual ? "fila-actual" : undefined}>
                  <td>{o.aseguradoraNombre}{o.esActual ? <span className="etiqueta">Actual</span> : null}</td>
                  <td className="numero">{pesos(o.primaAnual)}</td>
                  <td className="numero">{variacion(r.primaAnual, o.primaAnual)}</td>
                  <td>{o.amparosIncluidos} de {o.amparosTotales}</td>
                  <td>{o.deducible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="texto-secundario">Ordenadas por cobertura y, a igual cobertura, por menor prima. La comisión no interviene.</p>
      </details>
    </>
  );
}

export function Renovaciones() {
  const [lista, setLista] = useState<Renovacion[] | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const avisar = useAviso();

  const cargar = useCallback(() => {
    obtenerRenovaciones().then(setLista).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    cargar();
    obtenerCatalogos().then(setCatalogos).catch(() => undefined);
  }, [cargar]);

  async function marcar(r: Renovacion, estado: "RENOVADA" | "NO_RENOVADA") {
    setError("");
    try {
      await marcarRenovacion(r.id, estado);
      avisar(`Póliza ${r.numero} marcada como ${estado === "RENOVADA" ? "renovada" : "no renovada"}.`);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="cabecera-pagina">
        <h1>Renovaciones</h1>
        {lista ? <span className="texto-secundario">{lista.length} pólizas</span> : null}
      </div>
      <p className="texto-secundario pagina__intro">
        Pólizas que vencen en los próximos 30 días. La plataforma ya recotizó cada una con todas las aseguradoras y le envió la propuesta al cliente:
        a usted le queda llamarlo, resolver sus dudas y registrar el resultado. Están ordenadas por vencimiento.
      </p>
      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}
      {!lista && !error ? <Esqueleto filas={3} alto={170} /> : null}
      {lista && lista.length === 0 ? <p>No hay pólizas por vencer en los próximos 30 días.</p> : null}

      {lista?.map((r, i) => (
        <article key={r.id} className="renovacion en-cascada" style={{ "--i": i } as React.CSSProperties} aria-labelledby={`renovacion-${r.id}`}>
          <header className="renovacion__cabecera">
            <div>
              <h2 id={`renovacion-${r.id}`}>{r.tomador}</h2>
              <p className="texto-secundario">
                {catalogos ? nombreDe(catalogos.ramos, r.ramo) : r.ramo} · Póliza <Link to={`/asesor/solicitudes/${r.solicitudId}`}>{r.numero}</Link> · {r.aseguradora} · {pesos(r.primaAnual)} al año
                {r.asesor ? ` · Asesor: ${r.asesor}` : ""}
              </p>
            </div>
            <span className={`etiqueta etiqueta--vence${r.diasRestantes <= 7 ? " etiqueta--urgente" : ""}`}>
              Vence el {fecha(r.fechaVencimiento)} · {r.diasRestantes === 0 ? "hoy" : r.diasRestantes === 1 ? "en 1 día" : `en ${r.diasRestantes} días`}
            </span>
          </header>

          <Propuesta r={r} />

          <div className="renovacion__acciones no-imprimir">
            <a className="boton boton--secundario boton--compacto" href={`tel:${r.telefono}`}><Icono nombre="telefono" tamano={15} />Llamar al {r.telefono}</a>
            <span className="renovacion__resultado">
              <span className="texto-secundario">Resultado de la gestión:</span>
              <Boton className="boton--compacto" variante="principal" onClick={() => marcar(r, "RENOVADA")} aria-label={`Marcar ${r.numero} como renovada`}>Renovada</Boton>
              <Boton className="boton--compacto" onClick={() => marcar(r, "NO_RENOVADA")} aria-label={`Marcar ${r.numero} como no renovada`}>No renovada</Boton>
            </span>
          </div>
        </article>
      ))}
    </>
  );
}
