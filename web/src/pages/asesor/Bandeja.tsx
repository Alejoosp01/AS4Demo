import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import { type Bandeja as DatosBandeja, obtenerBandeja } from "../../api/interno";
import type { Catalogos } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Boton } from "../../components/Boton";
import { Campo, Selector } from "../../components/Campo";
import { Esqueleto } from "../../components/Esqueleto";
import { Estado, OPCIONES_ESTADO } from "../../components/Estado";
import { fecha } from "../../format/formato";
import { QueSigue } from "./QueSigue";
import "../../components/Tabla.css";
import "./Asesor.css";

const TAREAS = [
  { codigo: "", nombre: "Todas" },
  { codigo: "asesorar", nombre: "Por asesorar" },
  { codigo: "emitir", nombre: "Por emitir" },
  { codigo: "contactar", nombre: "Por contactar" },
  { codigo: "cliente", nombre: "Esperan al cliente" },
];

export function Bandeja() {
  const [params, setParams] = useSearchParams();
  const [datos, setDatos] = useState<DatosBandeja | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const [cargando, setCargando] = useState(true);
  const navegar = useNavigate();

  useEffect(() => {
    obtenerCatalogos().then(setCatalogos).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    setError("");
    setCargando(true);
    obtenerBandeja(params.toString()).then(setDatos).catch((e: Error) => setError(e.message)).finally(() => setCargando(false));
  }, [params]);

  function cambiar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    if (clave !== "pagina") nuevos.delete("pagina");
    // El filtro por tarea ya define el estado; se quita para que no se contradigan.
    if (clave === "tarea") nuevos.delete("estado");
    if (clave === "estado") nuevos.delete("tarea");
    setParams(nuevos);
  }

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    cambiar("q", texto.trim());
  }

  const tarea = params.get("tarea") ?? "";
  const soloMias = params.get("asignacion") === "mias";

  return (
    <>
      <div className="cabecera-pagina">
        <h1>Solicitudes</h1>
        {datos ? <span className="texto-secundario" aria-live="polite">{datos.total} solicitudes</span> : null}
      </div>

      <div className="filtro-tareas" role="group" aria-label="Filtrar por lo que hay que hacer">
        {TAREAS.map((t) => (
          <button key={t.codigo} type="button" className={`ficha${tarea === t.codigo ? " ficha--activa" : ""}`}
            aria-pressed={tarea === t.codigo} onClick={() => cambiar("tarea", t.codigo)}>
            {t.nombre}
          </button>
        ))}
        <label className="opcion filtro-tareas__mias">
          <input type="checkbox" checked={soloMias} onChange={(e) => cambiar("asignacion", e.target.checked ? "mias" : "")} />
          <span>Solo las mías</span>
        </label>
      </div>

      <form className="filtros" onSubmit={buscar} role="search">
        <Campo id="q" etiqueta="Buscar" type="search" ancho placeholder="Nombre, documento, n.º de solicitud o póliza" value={texto}
          onChange={(e) => setTexto(e.target.value)} />
        <Boton type="submit">Buscar</Boton>
        <Selector id="filtro-ramo" etiqueta="Ramo" vacio="Todos" opciones={catalogos?.ramos ?? []} value={params.get("ramo") ?? ""}
          onChange={(e) => cambiar("ramo", e.target.value)} />
        <Selector id="filtro-estado" etiqueta="Estado" vacio="Todos" opciones={OPCIONES_ESTADO} value={params.get("estado") ?? ""}
          onChange={(e) => cambiar("estado", e.target.value)} />
      </form>

      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}

      {!datos && !error ? <Esqueleto filas={6} alto={44} /> : null}

      {datos && datos.solicitudes.length === 0 ? <p>No hay solicitudes con estos filtros.</p> : null}

      {datos && datos.solicitudes.length > 0 ? (
        <>
          <div className={`tabla-contenedor${cargando ? " tabla-contenedor--cargando" : ""}`}>
            <table className="tabla tabla--filas-enlace">
              <thead>
                <tr>
                  <th scope="col" className="numero">N.º</th>
                  <th scope="col">Recibida</th>
                  <th scope="col">Tomador</th>
                  <th scope="col">Ramo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Qué sigue</th>
                  <th scope="col">Asesor</th>
                </tr>
              </thead>
              <tbody>
                {datos.solicitudes.map((s) => (
                  <tr key={s.id} onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) navegar(`/asesor/solicitudes/${s.id}`); }}>
                    <td className="numero"><Link to={`/asesor/solicitudes/${s.id}`}>{s.id}</Link></td>
                    <td>{fecha(s.creadaEn)}</td>
                    <td>
                      <Link to={`/asesor/solicitudes/${s.id}`}>{s.nombre}</Link>
                      <div className="texto-secundario">{s.tipoDocumento} {s.numeroDocumento}</div>
                    </td>
                    <td>{catalogos ? nombreDe(catalogos.ramos, s.ramo) : s.ramo}</td>
                    <td><Estado estado={s.estado} /></td>
                    <td><QueSigue paso={s.siguientePaso} /></td>
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
