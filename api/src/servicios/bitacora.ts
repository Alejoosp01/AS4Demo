import type { Prisma } from "@prisma/client";

export const AUTOR_PLATAFORMA = "Plataforma";
export const AUTOR_CLIENTE = "Cliente";

export type TipoEvento =
  | "SOLICITUD"
  | "DATOS_PARCIALES"
  | "COTIZACION"
  | "ASESORIA"
  | "ELECCION"
  | "ACEPTACION"
  | "NO_INTERES"
  | "EMISION"
  | "RECORDATORIO"
  | "ALERTA_ASESOR"
  | "CIERRE"
  | "PROPUESTA_RENOVACION"
  | "RENOVACION"
  | "CLASIFICACION"
  | "SARLAFT"
  | "CUMPLIMIENTO"
  | "RADICACION"
  | "SUSCRIPCION"
  | "CONDICIONES"
  | "PAGO"
  | "ENTREGA"
  | "CONTACTO"
  | "SINIESTRO"
  | "PQR";

type Cliente = Pick<Prisma.TransactionClient, "evento">;

/** Deja rastro de un paso del proceso (mecanismo de trazabilidad del numeral 10.2 del informe). */
export function registrarEvento(db: Cliente, solicitudId: number, tipo: TipoEvento, detalle: string, autor = AUTOR_PLATAFORMA, creadoEn = new Date()) {
  return db.evento.create({ data: { solicitudId, tipo, detalle, autor, creadoEn } });
}
