import { EstadoRenovacion, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { cotizar, crearAdaptadoresSimulados } from "../cotizacion/motor";
import type { Oferta } from "../cotizacion/tipos";
import { validarDatosRamo } from "../validacion/ramos";
import { registrarEvento } from "./bitacora";
import { DIAS_RENOVACION } from "./siguientePaso";

const DIA_MS = 24 * 60 * 60 * 1000;

export interface OfertaRenovacion {
  aseguradoraNombre: string;
  primaAnual: number;
  deducible: string;
  puntajeCobertura: number;
  amparosIncluidos: number;
  amparosTotales: number;
  esActual: boolean;
}

/** Resume la recotización para la propuesta. El orden es el del motor: cobertura y, a igualdad, menor prima. */
export function ofertasDeRenovacion(ofertas: Oferta[], aseguradoraActual: string): OfertaRenovacion[] {
  return ofertas.map((o) => ({
    aseguradoraNombre: o.aseguradoraNombre,
    primaAnual: o.primaAnual,
    deducible: o.deducible,
    puntajeCobertura: o.puntajeCobertura,
    amparosIncluidos: o.coberturas.filter((c) => c.incluida).length,
    amparosTotales: o.coberturas.length,
    esActual: o.aseguradoraNombre === aseguradoraActual,
  }));
}

export function ventanaDeRenovacion(hoy: Date, dias = DIAS_RENOVACION) {
  const desde = new Date(hoy);
  desde.setHours(0, 0, 0, 0);
  return { desde, hasta: new Date(desde.getTime() + (dias + 1) * DIA_MS) };
}

/**
 * Renovación anticipada (T15): treinta días antes del vencimiento la plataforma recotiza el mismo
 * riesgo con todas las aseguradoras y deja lista la propuesta. El envío al cliente es simulado.
 */
export async function generarPropuestasRenovacion(ahora = new Date()): Promise<number> {
  const { desde, hasta } = ventanaDeRenovacion(ahora);
  const polizas = await prisma.poliza.findMany({
    where: { fechaVencimiento: { gte: desde, lt: hasta }, estadoRenovacion: EstadoRenovacion.PENDIENTE, propuestaRenovacion: null },
    include: { solicitud: true, oferta: { include: { aseguradora: true } } },
  });
  if (polizas.length === 0) return 0;

  const activas = new Set((await prisma.aseguradora.findMany({ where: { activa: true } })).map((a) => a.codigo));
  // El riesgo se cotiza para la nueva vigencia: en autos, el vehículo ya tiene un año más.
  const adaptadores = crearAdaptadoresSimulados(ahora.getFullYear()).filter((a) => activas.has(a.codigo));
  let generadas = 0;

  for (const poliza of polizas) {
    const riesgo = validarDatosRamo(poliza.solicitud.ramo, poliza.solicitud.datosRamo ?? {});
    if (!riesgo.ok) continue;
    const ofertas = await cotizar(riesgo.valor, adaptadores);
    const actual = poliza.oferta.aseguradora.nombre;
    await prisma.$transaction(async (tx) => {
      await tx.propuestaRenovacion.create({
        data: {
          polizaId: poliza.id,
          enviadaEn: ahora,
          primaActual: poliza.oferta.primaAnual,
          aseguradoraActual: actual,
          ofertas: ofertasDeRenovacion(ofertas, actual) as unknown as Prisma.InputJsonValue,
        },
      });
      await registrarEvento(tx, poliza.solicitudId, "PROPUESTA_RENOVACION",
        `Recotización automática de la póliza ${poliza.numero} con ${ofertas.length} ofertas. Propuesta enviada a ${poliza.solicitud.correo} (envío simulado).`, undefined, ahora);
    });
    generadas += 1;
  }
  return generadas;
}
