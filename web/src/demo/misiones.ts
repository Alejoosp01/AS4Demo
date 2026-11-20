import { useSyncExternalStore } from "react";
import { MISIONES } from "./flujo";

const CLAVE = "as4-demo-misiones";
let cumplidas: Set<string> = leer();
const oyentes = new Set<() => void>();

function leer(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify([...cumplidas])); } catch { /* sin almacenamiento */ }
  oyentes.forEach((o) => o());
}

/** Marca una misión como cumplida y avisa (una sola vez) con el evento «as4-mision». */
export function completarMision(id: string) {
  if (cumplidas.has(id)) return;
  cumplidas = new Set(cumplidas).add(id);
  guardar();
  const mision = MISIONES.find((m) => m.id === id);
  if (mision) window.dispatchEvent(new CustomEvent("as4-mision", { detail: mision.texto }));
}

export function completarPorRuta(ruta: string) {
  MISIONES.filter((m) => m.ruta?.test(ruta)).forEach((m) => completarMision(m.id));
}

export function reiniciarMisiones() {
  cumplidas = new Set();
  guardar();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useMisiones(): Set<string> {
  return useSyncExternalStore(suscribir, () => cumplidas);
}

/** Etapa del cliente que la pantalla de la solicitud informa a la guía flotante. */
let etapaCliente: number | null = null;
const oyentesEtapa = new Set<() => void>();

export function informarEtapaCliente(etapa: number | null) {
  if (etapa === etapaCliente) return;
  etapaCliente = etapa;
  oyentesEtapa.forEach((o) => o());
}

export function useEtapaCliente(): number | null {
  return useSyncExternalStore((o) => { oyentesEtapa.add(o); return () => oyentesEtapa.delete(o); }, () => etapaCliente);
}
