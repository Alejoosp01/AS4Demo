import type { EstadoSolicitud } from "../api/tipos";
import "./Estado.css";

export const NOMBRES_ESTADO: Record<EstadoSolicitud, string> = {
  NUEVA: "Nueva",
  COTIZADA: "Cotizada",
  ASESORADA: "Asesorada",
  ACEPTADA: "Aceptada",
  NO_INTERESADA: "No interesada",
  EMITIDA: "Emitida",
  CERRADA: "Cerrada",
  EN_CUMPLIMIENTO: "En cumplimiento",
};

export const OPCIONES_ESTADO = Object.entries(NOMBRES_ESTADO).map(([codigo, nombre]) => ({ codigo, nombre }));

export function Estado({ estado }: { estado: EstadoSolicitud }) {
  return <span className={`estado estado--${estado.toLowerCase()}`}>{NOMBRES_ESTADO[estado]}</span>;
}
