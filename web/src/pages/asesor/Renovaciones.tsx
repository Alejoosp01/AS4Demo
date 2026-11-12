import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import { type Renovacion, marcarRenovacion, obtenerRenovaciones } from "../../api/interno";
import type { Catalogos } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { fecha, pesos } from "../../format/formato";
import "../../components/Tabla.css";
import "./Asesor.css";

export function Renovaciones() {
  const [lista, setLista] = useState<Renovacion[] | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

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
      setAviso(`Póliza ${r.numero} marcada como ${estado === "RENOVADA" ? "renovada" : "no renovada"}.`);
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
      <p className="texto-secundario">Pólizas que vencen en los próximos 30 días y aún no tienen gestión de renovación.</p>
      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}
      {aviso ? <div role="status"><Aviso><p>{aviso}</p></Aviso></div> : null}
      {lista && lista.length === 0 ? <p>No hay pólizas por vencer en los próximos 30 días.</p> : null}
      {lista && lista.length > 0 ? (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Póliza</th>
                <th scope="col">Tomador</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Ramo</th>
                <th scope="col">Aseguradora</th>
                <th scope="col" className="numero">Prima anual</th>
                <th scope="col">Vence</th>
                <th scope="col" className="numero">Días</th>
                <th scope="col">Renovación</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/asesor/solicitudes/${r.solicitudId}`}>{r.numero}</Link></td>
                  <td>{r.tomador}</td>
                  <td>{r.telefono}</td>
                  <td>{catalogos ? nombreDe(catalogos.ramos, r.ramo) : r.ramo}</td>
                  <td>{r.aseguradora}</td>
                  <td className="numero">{pesos(r.primaAnual)}</td>
                  <td>{fecha(r.fechaVencimiento)}</td>
                  <td className="numero">{r.diasRestantes}</td>
                  <td>
                    <div className="acciones-fila">
                      <Boton onClick={() => marcar(r, "RENOVADA")} aria-label={`Marcar ${r.numero} como renovada`}>Renovada</Boton>
                      <Boton onClick={() => marcar(r, "NO_RENOVADA")} aria-label={`Marcar ${r.numero} como no renovada`}>No renovada</Boton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
