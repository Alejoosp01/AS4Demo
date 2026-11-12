import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import { type Bandeja as DatosBandeja, obtenerBandeja } from "../../api/interno";
import type { Catalogos } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { Campo, Selector } from "../../components/Campo";
import { Estado, OPCIONES_ESTADO } from "../../components/Estado";
import { fecha } from "../../format/formato";
import "../../components/Tabla.css";

const ASIGNACION = [{ codigo: "mias", nombre: "Mis solicitudes" }];

export function Bandeja() {
  const [params, setParams] = useSearchParams();
  const [datos, setDatos] = useState<DatosBandeja | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState(params.get("q") ?? "");

  useEffect(() => {
    obtenerCatalogos().then(setCatalogos).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    setError("");
    obtenerBandeja(params.toString()).then(setDatos).catch((e: Error) => setError(e.message));
  }, [params]);

  function cambiar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    if (clave !== "pagina") nuevos.delete("pagina");
    setParams(nuevos);
  }

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    cambiar("q", texto.trim());
  }

  return (
    <>
      <div className="cabecera-pagina">
        <h1>Bandeja de solicitudes</h1>
        {datos ? <span className="texto-secundario" aria-live="polite">{datos.total} solicitudes</span> : null}
      </div>

      <form className="filtros" onSubmit={buscar} role="search">
        <Campo id="q" etiqueta="Buscar" type="search" ancho placeholder="Nombre, documento, n.º de solicitud o póliza" value={texto}
          onChange={(e) => setTexto(e.target.value)} />
        <Boton type="submit">Buscar</Boton>
        <Selector id="filtro-ramo" etiqueta="Ramo" vacio="Todos" opciones={catalogos?.ramos ?? []} value={params.get("ramo") ?? ""}
          onChange={(e) => cambiar("ramo", e.target.value)} />
        <Selector id="filtro-estado" etiqueta="Estado" vacio="Todos" opciones={OPCIONES_ESTADO} value={params.get("estado") ?? ""}
          onChange={(e) => cambiar("estado", e.target.value)} />
        <Selector id="filtro-asignacion" etiqueta="Asignación" vacio="Todas" opciones={ASIGNACION} value={params.get("asignacion") ?? ""}
          onChange={(e) => cambiar("asignacion", e.target.value)} />
      </form>

      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}

      {datos && datos.solicitudes.length === 0 ? <p>No hay solicitudes con estos filtros.</p> : null}

      {datos && datos.solicitudes.length > 0 ? (
        <>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col" className="numero">N.º</th>
                  <th scope="col">Recibida</th>
                  <th scope="col">Tomador</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Ramo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Asesor</th>
                </tr>
              </thead>
              <tbody>
                {datos.solicitudes.map((s) => (
                  <tr key={s.id}>
                    <td className="numero"><Link to={`/asesor/solicitudes/${s.id}`}>{s.id}</Link></td>
                    <td>{fecha(s.creadaEn)}</td>
                    <td><Link to={`/asesor/solicitudes/${s.id}`}>{s.nombre}</Link></td>
                    <td>{s.tipoDocumento} {s.numeroDocumento}</td>
                    <td>{catalogos ? nombreDe(catalogos.ramos, s.ramo) : s.ramo}</td>
                    <td><Estado estado={s.estado} /></td>
                    <td>{s.asesor ?? "Sin asignar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {datos.paginas > 1 ? (
            <nav className="paginacion" aria-label="Páginas">
              <Boton disabled={datos.pagina <= 1} onClick={() => cambiar("pagina", String(datos.pagina - 1))}>Anterior</Boton>
              <span>Página {datos.pagina} de {datos.paginas}</span>
              <Boton disabled={datos.pagina >= datos.paginas} onClick={() => cambiar("pagina", String(datos.pagina + 1))}>Siguiente</Boton>
            </nav>
          ) : null}
        </>
      ) : null}
    </>
  );
}
