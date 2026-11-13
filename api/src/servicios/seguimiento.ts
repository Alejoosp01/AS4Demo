import { EstadoSolicitud, Prisma, Rol } from "@prisma/client";
import { prisma } from "../db";
import { registrarEvento } from "./bitacora";
import { generarPropuestasRenovacion } from "./renovaciones";

// Reglas del TO-BE para solicitudes con datos pendientes (T06 y T07).
export const PLAZOS = { recordatorioHoras: 24, alertaAsesorHoras: 48, cierreDiasHabiles: 5 } as const;

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

export type AccionSeguimiento = "RECORDATORIO" | "ALERTA_ASESOR" | "CIERRE";

/** Días hábiles (lunes a viernes) completos entre dos fechas. El prototipo no descuenta festivos. */
export function diasHabilesEntre(desde: Date, hasta: Date): number {
  let dias = 0;
  for (let t = desde.getTime() + DIA_MS; t <= hasta.getTime(); t += DIA_MS) {
    const diaSemana = new Date(t).getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias += 1;
  }
  return dias;
}

interface EstadoSeguimiento {
  creadaEn: Date;
  recordatorioEn: Date | null;
  alertaAsesorEn: Date | null;
}

/** Qué avisos le corresponden ahora a una solicitud que sigue sin los datos completos. */
export function accionesSeguimiento(s: EstadoSeguimiento, ahora: Date): AccionSeguimiento[] {
  if (diasHabilesEntre(s.creadaEn, ahora) >= PLAZOS.cierreDiasHabiles) return ["CIERRE"];
  const horas = (ahora.getTime() - s.creadaEn.getTime()) / HORA_MS;
  const acciones: AccionSeguimiento[] = [];
  if (horas >= PLAZOS.recordatorioHoras && !s.recordatorioEn) acciones.push("RECORDATORIO");
  if (horas >= PLAZOS.alertaAsesorHoras && !s.alertaAsesorEn) acciones.push("ALERTA_ASESOR");
  return acciones;
}

// Reparto equilibrado: la solicitud va al asesor con menos solicitudes abiertas.
export async function asesorConMenosCarga(tx: Prisma.TransactionClient): Promise<number | null> {
  const abiertas: EstadoSolicitud[] = [EstadoSolicitud.NUEVA, EstadoSolicitud.COTIZADA, EstadoSolicitud.ASESORADA];
  const asesores = await tx.usuario.findMany({
    where: { rol: Rol.ASESOR },
    select: { id: true, _count: { select: { solicitudes: { where: { estado: { in: abiertas } } } } } },
    orderBy: { id: "asc" },
  });
  if (asesores.length === 0) return null;
  return asesores.reduce((menor, a) => (a._count.solicitudes < menor._count.solicitudes ? a : menor)).id;
}

/**
 * Recorre las solicitudes sin datos completos y aplica los plazos. Los envíos al cliente son
 * simulados: quedan en la bitácora de la solicitud y en el registro del servicio.
 */
export async function ejecutarSeguimiento(ahora = new Date()) {
  const pendientes = await prisma.solicitud.findMany({ where: { estado: EstadoSolicitud.NUEVA } });
  const resumen = { recordatorios: 0, alertas: 0, cierres: 0, propuestasRenovacion: 0 };

  for (const s of pendientes) {
    const acciones = accionesSeguimiento(s, ahora);
    if (acciones.length === 0) continue;
    await prisma.$transaction(async (tx) => {
      if (acciones.includes("CIERRE")) {
        await tx.solicitud.update({ where: { id: s.id }, data: { estado: EstadoSolicitud.CERRADA, cerradaEn: ahora } });
        await registrarEvento(tx, s.id, "CIERRE", `Solicitud cerrada: pasaron ${PLAZOS.cierreDiasHabiles} días hábiles sin que el cliente completara sus datos.`, undefined, ahora);
        resumen.cierres += 1;
        return;
      }
      if (acciones.includes("RECORDATORIO")) {
        await tx.solicitud.update({ where: { id: s.id }, data: { recordatorioEn: ahora } });
        await registrarEvento(tx, s.id, "RECORDATORIO", `Recordatorio enviado a ${s.correo} con el enlace de los campos pendientes (envío simulado).`, undefined, ahora);
        resumen.recordatorios += 1;
      }
      if (acciones.includes("ALERTA_ASESOR")) {
        const asesorId = s.asesorId ?? (await asesorConMenosCarga(tx));
        await tx.solicitud.update({ where: { id: s.id }, data: { alertaAsesorEn: ahora, asesorId } });
        await registrarEvento(tx, s.id, "ALERTA_ASESOR", `Alerta al asesor: el cliente lleva más de ${PLAZOS.alertaAsesorHoras} horas sin completar sus datos.`, undefined, ahora);
        resumen.alertas += 1;
      }
    });
  }

  resumen.propuestasRenovacion = await generarPropuestasRenovacion(ahora);
  return resumen;
}

/** Ejecuta el seguimiento al arrancar y luego cada cierto tiempo. Un fallo no detiene el servicio. */
export function programarSeguimiento(cadaMinutos = 10) {
  const correr = () => {
    ejecutarSeguimiento()
      .then((r) => {
        const total = r.recordatorios + r.alertas + r.cierres + r.propuestasRenovacion;
        if (total > 0) process.stdout.write(`Seguimiento automático: ${JSON.stringify(r)}\n`);
      })
      .catch((error) => process.stderr.write(`El seguimiento automático falló: ${String(error)}\n`));
  };
  correr();
  return setInterval(correr, cadaMinutos * 60 * 1000).unref();
}
