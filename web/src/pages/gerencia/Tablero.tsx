import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { nombreDe } from "../../api/cliente";
import { type Tablero as DatosTablero, obtenerTablero } from "../../api/interno";
import type { Ramo } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { GraficaBarras, GraficaBarrasH, GraficaLineas } from "../../components/Grafica";
import { FiltrosPeriodo, porcentaje, useCatalogos, useFiltrosPeriodo } from "./Filtros";
import "../../components/Grafica.css";
import "../../components/Tabla.css";

const RAMOS: Ramo[] = ["AUTOS", "SALUD", "VIDA", "HOGAR", "PYMES"];

function Panel({ titulo, descripcion, grafica, tabla }: { titulo: string; descripcion: string; grafica: ReactNode; tabla: ReactNode }) {
  return (
    <section className="panel" aria-label={titulo}>
      <h2>{titulo}</h2>
      <p className="descripcion">{descripcion}</p>
      <div className="panel__grafica">{grafica}</div>
      <div className="panel__tabla"><div className="tabla-contenedor">{tabla}</div></div>
    </section>
  );
}

const suma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);
const pct = (v: number | null) => (v === null ? "—" : porcentaje(v));

export function Tablero() {
  const catalogos = useCatalogos();
  const { meses, ramo, consulta } = useFiltrosPeriodo();
  const [datos, setDatos] = useState<DatosTablero | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    obtenerTablero(meses, ramo).then(setDatos).catch((e: Error) => setError(e.message));
  }, [meses, ramo]);

  const nombreRamo = (r: string) => (catalogos ? nombreDe(catalogos.ramos, r) : r);
  const nombreMotivo = (m: string) => (catalogos ? nombreDe(catalogos.motivosNoInteres, m) : m);

  return (
    <>
      <div className="cabecera-pagina">
        <h1>Tablero de gestión</h1>
        {datos ? <span className="texto-secundario">{ramo ? nombreRamo(ramo) : "Todos los ramos"}</span> : null}
      </div>
      <FiltrosPeriodo catalogos={catalogos} />
      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}
      {!datos ? (error ? null : <p className="texto-secundario">Cargando el tablero…</p>) : (() => {
        const etiquetas = datos.meses.map((m) => m.etiqueta);
        const etiquetaMes = (clave: string) => datos.meses.find((m) => m.clave === clave)?.etiqueta ?? clave;
        const ramosVisibles = ramo ? RAMOS.filter((r) => r === ramo) : RAMOS;
        const totalMotivos = suma(datos.motivos.map((m) => m.cantidad));
        const totalCotizadas = suma(datos.productos.map((p) => p.cotizadas));
        const imp = datos.imparcialidad;
        return (
          <>
            {imp.alertas.length > 0 ? (
              <Aviso tipo="alerta">
                <p>
                  <strong>Concentración de ventas.</strong>{" "}
                  {imp.aseguradoras.filter((a) => imp.alertas.includes(a.aseguradora)).map((a) => `${a.aseguradora} tiene el ${porcentaje(a.porcentaje)}`).join("; ")}{" "}
                  de las ventas del periodo, por encima del límite de {imp.umbral} %. <Link to={`/gerencia/imparcialidad?${consulta}`}>Ver el control de imparcialidad</Link>.
                </p>
              </Aviso>
            ) : null}

            <Panel titulo="Siniestros reportados" descripcion="Siniestros avisados por los clientes en cada mes."
              grafica={<GraficaBarras titulo="Siniestros reportados por mes" categorias={etiquetas} series={[{ nombre: "Siniestros", valores: datos.siniestros.map((s) => s.total) }]} />}
              tabla={
                <table className="tabla">
                  <thead><tr><th scope="col">Mes</th>{ramosVisibles.map((r) => <th key={r} scope="col" className="numero">{nombreRamo(r)}</th>)}{ramo ? null : <th scope="col" className="numero">Total</th>}</tr></thead>
                  <tbody>{datos.siniestros.map((s) => (
                    <tr key={s.mes}><td>{etiquetaMes(s.mes)}</td>{ramosVisibles.map((r) => <td key={r} className="numero">{s.porRamo[r]}</td>)}{ramo ? null : <td className="numero">{s.total}</td>}</tr>
                  ))}</tbody>
                  <tfoot><tr><td>Total</td>{ramosVisibles.map((r) => <td key={r} className="numero">{suma(datos.siniestros.map((s) => s.porRamo[r]))}</td>)}{ramo ? null : <td className="numero">{suma(datos.siniestros.map((s) => s.total))}</td>}</tr></tfoot>
                </table>
              } />

            <Panel titulo="Tasa de renovación" descripcion="Pólizas renovadas sobre pólizas que vencieron en el mes."
              grafica={<GraficaLineas titulo="Tasa de renovación por mes" categorias={etiquetas} series={[{ nombre: "Tasa de renovación", valores: datos.renovacion.map((r) => r.tasa) }]} formato={(v) => porcentaje(v)} maximo={100} enteros={false} />}
              tabla={
                <table className="tabla">
                  <thead><tr><th scope="col">Mes</th><th scope="col" className="numero">Vencidas</th><th scope="col" className="numero">Renovadas</th><th scope="col" className="numero">Tasa</th></tr></thead>
                  <tbody>{datos.renovacion.map((r) => (
                    <tr key={r.mes}><td>{etiquetaMes(r.mes)}</td><td className="numero">{r.vencidas}</td><td className="numero">{r.renovadas}</td><td className="numero">{pct(r.tasa)}</td></tr>
                  ))}</tbody>
                </table>
              } />

            <Panel titulo="PQR" descripcion="Peticiones, quejas y reclamos recibidos en cada mes."
              grafica={<GraficaBarras titulo="PQR por mes y tipo" categorias={etiquetas} series={[
                { nombre: "Peticiones", valores: datos.pqr.map((p) => p.PETICION) },
                { nombre: "Quejas", valores: datos.pqr.map((p) => p.QUEJA) },
                { nombre: "Reclamos", valores: datos.pqr.map((p) => p.RECLAMO) },
              ]} />}
              tabla={
                <table className="tabla">
                  <thead><tr><th scope="col">Mes</th><th scope="col" className="numero">Peticiones</th><th scope="col" className="numero">Quejas</th><th scope="col" className="numero">Reclamos</th><th scope="col" className="numero">Total</th></tr></thead>
                  <tbody>{datos.pqr.map((p) => (
                    <tr key={p.mes}><td>{etiquetaMes(p.mes)}</td><td className="numero">{p.PETICION}</td><td className="numero">{p.QUEJA}</td><td className="numero">{p.RECLAMO}</td><td className="numero">{p.total}</td></tr>
                  ))}</tbody>
                </table>
              } />

            <Panel titulo="Motivos de no compra" descripcion="Motivo que eligió el cliente al marcar «No me interesa»."
              grafica={<GraficaBarrasH titulo="Motivos de no compra" categorias={datos.motivos.map((m) => nombreMotivo(m.motivo))} valores={datos.motivos.map((m) => m.cantidad)} />}
              tabla={
                <table className="tabla">
                  <thead><tr><th scope="col">Motivo</th><th scope="col" className="numero">Solicitudes</th><th scope="col" className="numero">Participación</th></tr></thead>
                  <tbody>{datos.motivos.map((m) => (
                    <tr key={m.motivo}><td>{nombreMotivo(m.motivo)}</td><td className="numero">{m.cantidad}</td><td className="numero">{pct(totalMotivos ? (m.cantidad / totalMotivos) * 100 : null)}</td></tr>
                  ))}</tbody>
                  <tfoot><tr><td>Total</td><td className="numero">{totalMotivos}</td><td /></tr></tfoot>
                </table>
              } />

            <Panel titulo="Productos más cotizados" descripcion="Solicitudes cotizadas por ramo en el periodo."
              grafica={<GraficaBarrasH titulo="Cotizaciones por ramo" categorias={datos.productos.map((p) => nombreRamo(p.ramo))} valores={datos.productos.map((p) => p.cotizadas)} />}
              tabla={
                <table className="tabla">
                  <thead><tr><th scope="col">Ramo</th><th scope="col" className="numero">Cotizaciones</th><th scope="col" className="numero">Participación</th></tr></thead>
                  <tbody>{datos.productos.map((p) => (
                    <tr key={p.ramo}><td>{nombreRamo(p.ramo)}</td><td className="numero">{p.cotizadas}</td><td className="numero">{pct(totalCotizadas ? (p.cotizadas / totalCotizadas) * 100 : null)}</td></tr>
                  ))}</tbody>
                </table>
              } />

            <Panel titulo="Cotizado frente a vendido" descripcion="Solicitudes cotizadas en el mes y cuántas de ellas terminaron en venta."
              grafica={<GraficaBarras titulo="Cotizado frente a vendido por mes" categorias={etiquetas} series={[
                { nombre: "Cotizadas", valores: datos.cotizadoVsVendido.map((c) => c.cotizadas) },
                { nombre: "Vendidas", valores: datos.cotizadoVsVendido.map((c) => c.vendidas) },
              ]} />}
              tabla={
                <table className="tabla">
                  <thead><tr><th scope="col">Mes</th><th scope="col" className="numero">Cotizadas</th><th scope="col" className="numero">Vendidas</th><th scope="col" className="numero">Conversión</th></tr></thead>
                  <tbody>{datos.cotizadoVsVendido.map((c) => (
                    <tr key={c.mes}><td>{etiquetaMes(c.mes)}</td><td className="numero">{c.cotizadas}</td><td className="numero">{c.vendidas}</td><td className="numero">{pct(c.conversion)}</td></tr>
                  ))}</tbody>
                </table>
              } />
          </>
        );
      })()}
    </>
  );
}
