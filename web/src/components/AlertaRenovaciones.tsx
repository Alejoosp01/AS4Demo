import type React from "react";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type Renovacion, type Usuario, obtenerRenovaciones, obtenerRenovacionesGerencia } from "../api/interno";
import { completarMision } from "../demo/misiones";
import { fecha, pesos } from "../format/formato";
import { Icono } from "./Icono";
import { Modal } from "./Modal";
import "./AlertaRenovaciones.css";

interface Estado {
  lista: Renovacion[] | null;
  abrir: () => void;
  recargar: () => void;
}

const Contexto = createContext<Estado>({ lista: null, abrir: () => undefined, recargar: () => undefined });
export const useRenovacionesPorVencer = () => useContext(Contexto);

/** Clasifica una póliza por la urgencia de su vencimiento. */
export function urgencia(dias: number): "critica" | "proxima" | "normal" {
  return dias <= 7 ? "critica" : dias <= 15 ? "proxima" : "normal";
}

export const textoDias = (d: number) => (d <= 0 ? "vence hoy" : d === 1 ? "vence mañana" : `vence en ${d} días`);

const clave = (u: Usuario) => `as4-aviso-renovaciones-${u.id}`;

/**
 * Al entrar, asesor y gerencia ven una ventana emergente con las pólizas que vencen en los próximos 30 días.
 * Aparece una vez por sesión del navegador; la campana de la barra superior la vuelve a abrir.
 */
export function ProveedorAlertaRenovaciones({ usuario, children }: { usuario: Usuario; children: ReactNode }) {
  const [lista, setLista] = useState<Renovacion[] | null>(null);
  const [abierto, setAbierto] = useState(false);

  const recargar = useCallback(() => {
    const pedir = usuario.rol === "GERENTE" ? obtenerRenovacionesGerencia : obtenerRenovaciones;
    pedir().then((l) => {
      setLista(l);
      let visto = false;
      try { visto = sessionStorage.getItem(clave(usuario)) === "1"; } catch { /* sin almacenamiento */ }
      if (!visto && l.length > 0) setAbierto(true);
    }).catch(() => setLista([]));
  }, [usuario]);

  useEffect(recargar, [recargar]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    try { sessionStorage.setItem(clave(usuario), "1"); } catch { /* sin almacenamiento */ }
  }, [usuario]);

  const valor = useMemo(() => ({ lista, abrir: () => setAbierto(true), recargar }), [lista, recargar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {lista ? <VentanaRenovaciones lista={lista} rol={usuario.rol} abierto={abierto} onCerrar={cerrar} /> : null}
    </Contexto.Provider>
  );
}

function VentanaRenovaciones({ lista, rol, abierto, onCerrar }: { lista: Renovacion[]; rol: Usuario["rol"]; abierto: boolean; onCerrar: () => void }) {
  const criticas = lista.filter((r) => urgencia(r.diasRestantes) === "critica");
  const proximas = lista.filter((r) => urgencia(r.diasRestantes) === "proxima");
  const sinRespuesta = lista.filter((r) => r.propuesta?.sinRespuesta);
  const primaEnJuego = lista.reduce((t, r) => t + r.primaAnual, 0);
  const tono = criticas.length > 0 ? "urgente" : "alerta";
  const destino = rol === "GERENTE" ? "/gerencia/renovaciones" : "/asesor/renovaciones";
  useEffect(() => { if (abierto) completarMision(rol === "GERENTE" ? "g-aviso" : "a-aviso"); }, [abierto, rol]);

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} icono="campana" tono={tono} ancho={620}
      titulo={`${lista.length} ${lista.length === 1 ? "póliza vence" : "pólizas vencen"} en los próximos 30 días`}
      pie={
        <>
          <button type="button" className="boton boton--secundario" onClick={onCerrar}>Recordármelo después</button>
          <Link className="boton boton--principal" to={destino} onClick={onCerrar} data-foco-inicial>
            {rol === "GERENTE" ? "Ver vencimientos" : "Ir a renovaciones"}<Icono nombre="flecha" tamano={16} />
          </Link>
        </>
      }>
      <p className="texto-secundario">
        {rol === "GERENTE"
          ? "Resumen de la cartera que está por renovarse. La plataforma ya recotizó cada póliza (T15) y el cliente decide desde su enlace (T16)."
          : "La plataforma ya recotizó y envió la propuesta a cada cliente. A usted le corresponde llamar cuando pasan cinco días sin respuesta."}
      </p>
      <div className="alerta-ren__cifras">
        <div className="alerta-ren__cifra alerta-ren__cifra--critica"><strong>{criticas.length}</strong><span>en 7 días o menos</span></div>
        <div className="alerta-ren__cifra alerta-ren__cifra--proxima"><strong>{proximas.length}</strong><span>entre 8 y 15 días</span></div>
        <div className="alerta-ren__cifra alerta-ren__cifra--llamar"><strong>{sinRespuesta.length}</strong><span>sin respuesta: llamar</span></div>
        <div className="alerta-ren__cifra"><strong>{pesos(primaEnJuego)}</strong><span>prima anual en juego</span></div>
      </div>
      <ul className="alerta-ren__lista">
        {lista.slice(0, 6).map((r, i) => {
          const u = urgencia(r.diasRestantes);
          const porcentaje = Math.max(4, Math.min(100, ((30 - r.diasRestantes) / 30) * 100));
          return (
            <li key={r.id} className={`alerta-ren__item alerta-ren__item--${u} en-cascada`} style={{ "--i": i } as React.CSSProperties}>
              <div className="alerta-ren__quien">
                <strong>{r.tomador}</strong>
                <span className="texto-secundario">Póliza {r.numero} · {r.aseguradora} · {fecha(r.fechaVencimiento)}</span>
                <span className="alerta-ren__barra" aria-hidden="true"><span style={{ width: `${porcentaje}%` }} /></span>
              </div>
              <span className="alerta-ren__dias">{textoDias(r.diasRestantes)}</span>
              {r.propuesta?.sinRespuesta ? <span className="etiqueta etiqueta--urgente">Llamar</span> : null}
            </li>
          );
        })}
      </ul>
      {lista.length > 6 ? <p className="texto-secundario">Y {lista.length - 6} más en la lista completa.</p> : null}
    </Modal>
  );
}

/** Campana de la barra superior con el número de pólizas por vencer. */
export function CampanaRenovaciones() {
  const { lista, abrir } = useRenovacionesPorVencer();
  if (!lista) return null;
  const criticas = lista.filter((r) => r.diasRestantes <= 7).length;
  return (
    <button type="button" className={`campana no-imprimir${criticas > 0 ? " campana--urgente" : ""}`} onClick={abrir}
      aria-label={`Renovaciones por vencer: ${lista.length}`} title="Renovaciones por vencer">
      <Icono nombre="campana" tamano={20} />
      {lista.length > 0 ? <span className="campana__numero">{lista.length}</span> : null}
    </button>
  );
}
