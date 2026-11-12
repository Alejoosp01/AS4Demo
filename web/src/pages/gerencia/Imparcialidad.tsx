import { useEffect, useState } from "react";
import { type Tablero, obtenerTablero } from "../../api/interno";
import { Aviso } from "../../components/Aviso";
import { GraficaBarrasH } from "../../components/Grafica";
import { FiltrosPeriodo, porcentaje, useCatalogos, useFiltrosPeriodo } from "./Filtros";
import "../../components/Grafica.css";
import "../../components/Tabla.css";

export function Imparcialidad() {
  const catalogos = useCatalogos();
  const { meses, ramo } = useFiltrosPeriodo();
  const [datos, setDatos] = useState<Tablero["imparcialidad"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    obtenerTablero(meses, ramo).then((t) => setDatos(t.imparcialidad)).catch((e: Error) => setError(e.message));
  }, [meses, ramo]);

  return (
    <>
      <h1>Control de imparcialidad</h1>
      <p className="texto-secundario" style={{ maxWidth: 760 }}>
        El comparativo se ordena por cobertura y precio, y la comisión no interviene. Este control mide la participación de cada
        aseguradora en las ventas del periodo y avisa cuando una supera el límite, para revisar que las recomendaciones tengan sustento técnico.
      </p>
      <FiltrosPeriodo catalogos={catalogos} />
      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}
      {datos ? (
        <>
          {datos.alertas.length > 0 ? (
            <Aviso tipo="alerta">
              <p>
                <strong>{datos.alertas.join(", ")}</strong> {datos.alertas.length === 1 ? "supera" : "superan"} el {datos.umbral} % de las ventas del periodo.
              </p>
            </Aviso>
          ) : (
            <Aviso><p>Ninguna aseguradora supera el {datos.umbral} % de las ventas del periodo.</p></Aviso>
          )}
          {datos.total === 0 ? <p>No hay ventas en el periodo.</p> : (
            <section className="panel" aria-label="Participación en las ventas">
              <h2>Participación en las ventas ({datos.total} ventas)</h2>
              <div className="panel__grafica">
                <GraficaBarrasH titulo="Porcentaje de ventas por aseguradora" categorias={datos.aseguradoras.map((a) => a.aseguradora)}
                  valores={datos.aseguradoras.map((a) => a.porcentaje)} formato={porcentaje} maximo={100}
                  umbral={{ valor: datos.umbral, etiqueta: `Límite ${datos.umbral} %` }} />
              </div>
              <div className="panel__tabla">
                <div className="tabla-contenedor">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th scope="col">Aseguradora</th>
                        <th scope="col" className="numero">Ventas</th>
                        <th scope="col" className="numero">Participación</th>
                        <th scope="col" className="numero">Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.aseguradoras.map((a) => (
                        <tr key={a.aseguradora}>
                          <td>{a.aseguradora}{datos.alertas.includes(a.aseguradora) ? <span className="texto-secundario"> (sobre el límite)</span> : null}</td>
                          <td className="numero">{a.ventas}</td>
                          <td className="numero">{porcentaje(a.porcentaje)}</td>
                          <td className="numero">{porcentaje(a.comisionPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      ) : null}
    </>
  );
}
