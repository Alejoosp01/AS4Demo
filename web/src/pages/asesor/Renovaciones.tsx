import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { nombreDe, obtenerCatalogos } from "../../api/cliente";
import type { ErrorApi } from "../../api/http";
import { type Renovacion, obtenerRenovaciones, registrarRenovacion } from "../../api/interno";
import type { Catalogos } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { useAviso } from "../../components/Avisos";
import { Boton } from "../../components/Boton";
import { Selector } from "../../components/Campo";
import { Esqueleto } from "../../components/Esqueleto";
import { Icono } from "../../components/Icono";
import { fecha, hace, pesos, variacion } from "../../format/formato";
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

/** Cuando el cliente decide por teléfono, el asesor registra esa decisión en su nombre. */
function DecisionPorTelefono({ r, catalogos, onRegistrada }: { r: Renovacion; catalogos: Catalogos | null; onRegistrada: (texto: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [aseguradora, setAseguradora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ofertas = r.propuesta?.ofertas ?? [];

  async function registrar(datos: unknown, texto: string) {
    setEnviando(true);
    setError("");
    try {
      await registrarRenovacion(r.solicitudId, datos);
      onRegistrada(texto);
    } catch (e) {
      const err = e as ErrorApi;
      setError(Object.values(err.errores ?? {})[0] ?? err.message);
      setEnviando(false);
    }
  }

  if (!abierto) return <Boton className="boton--compacto" variante="principal" onClick={() => setAbierto(true)}>Registrar la decisión del cliente</Boton>;

  return (
    <div className="decision-telefono">
      {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}
      <div className="decision-telefono__opcion">
        <Selector id={`oferta-${r.id}`} etiqueta="Renueva con" opciones={ofertas.map((o) => ({ codigo: o.aseguradoraNombre, nombre: `${o.aseguradoraNombre}, ${pesos(o.primaAnual)}${o.esActual ? " (actual)" : ""}` }))}
          value={aseguradora} onChange={(e) => setAseguradora(e.target.value)} />
        <Boton className="boton--compacto" variante="principal" disabled={enviando || !aseguradora}
          onClick={() => registrar({ decision: "RENOVAR", aseguradora }, `Póliza ${r.numero} renovada con ${aseguradora}.`)}>Registrar renovación</Boton>
      </div>
      <div className="decision-telefono__opcion">
        <Selector id={`motivo-${r.id}`} etiqueta="No renueva por" opciones={catalogos?.motivosNoRenovacion ?? []} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <Boton className="boton--compacto" disabled={enviando || !motivo}
          onClick={() => registrar({ decision: "NO_RENOVAR", motivo }, `Póliza ${r.numero} registrada como no renovada.`)}>Registrar que no renueva</Boton>
      </div>
      <Boton variante="enlace" onClick={() => setAbierto(false)}>Cancelar</Boton>
    </div>
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

  function alRegistrar(texto: string) {
    avisar(texto);
    cargar();
  }

  return (
    <>
      <div className="cabecera-pagina">
        <h1>Renovaciones</h1>
        {lista ? <span className="texto-secundario">{lista.length} pólizas</span> : null}
      </div>
      <p className="texto-secundario pagina__intro">
        Pólizas que vencen en los próximos 30 días. La plataforma ya recotizó cada una y le envió la propuesta al cliente, que decide desde su enlace.
        A usted solo le corresponde llamar cuando pasan cinco días sin respuesta. Están ordenadas por vencimiento.
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

          {r.propuesta ? (
            <p className={r.propuesta.sinRespuesta ? "renovacion__estado renovacion__estado--llamar" : "renovacion__estado"}>
              {r.propuesta.sinRespuesta
                ? <><Icono nombre="telefono" tamano={16} /> Propuesta enviada {hace(r.propuesta.enviadaEn)} y sin respuesta: <strong>le corresponde llamar</strong>.</>
                : <><Icono nombre="reloj" tamano={16} /> Propuesta enviada {hace(r.propuesta.enviadaEn)}. Esperando la decisión del cliente; aún no requiere acción suya.</>}
            </p>
          ) : null}

          <Propuesta r={r} />

          <div className="renovacion__acciones no-imprimir">
            <a className="boton boton--secundario boton--compacto" href={`tel:${r.telefono}`}><Icono nombre="telefono" tamano={15} />Llamar al {r.telefono}</a>
            <Link className="boton boton--secundario boton--compacto" to={`/solicitud/${r.token}`}>Ver el enlace del cliente</Link>
            <DecisionPorTelefono r={r} catalogos={catalogos} onRegistrada={alRegistrar} />
          </div>
        </article>
      ))}
    </>
  );
}
