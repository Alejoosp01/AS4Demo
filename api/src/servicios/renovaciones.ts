import { EstadoRenovacion, EstadoSolicitud, Prisma } from "@prisma/client";
import { MOTIVOS_NO_RENOVACION } from "../catalogos";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { erroresPorCampo } from "../validacion/errores";
import { decisionRenovacionSchema } from "../validacion/solicitud";
import { prisma } from "../db";
import { cotizar, crearAdaptadoresSimulados } from "../cotizacion/motor";
import type { Oferta } from "../cotizacion/tipos";
import { validarDatosRamo } from "../validacion/ramos";
import { AUTOR_CLIENTE, registrarEvento } from "./bitacora";
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
    // La propuesta sale 30 días antes del vencimiento. Si el servicio arranca con pólizas que ya pasaron
    // esa fecha (como las de los datos de ejemplo), se registra con la fecha en que debió salir.
    const enviadaEn = new Date(Math.min(ahora.getTime(), poliza.fechaVencimiento.getTime() - DIAS_RENOVACION * DIA_MS));
    await prisma.$transaction(async (tx) => {
      await tx.propuestaRenovacion.create({
        data: {
          polizaId: poliza.id,
          enviadaEn,
          primaActual: poliza.oferta.primaAnual,
          aseguradoraActual: actual,
          ofertas: ofertasDeRenovacion(ofertas, actual) as unknown as Prisma.InputJsonValue,
        },
      });
      await registrarEvento(tx, poliza.solicitudId, "PROPUESTA_RENOVACION",
        `Recotización automática de la póliza ${poliza.numero} con ${ofertas.length} ofertas. Propuesta enviada a ${poliza.solicitud.correo} (envío simulado).`, undefined, enviadaEn);
    });
    generadas += 1;
  }
  return generadas;
}

/**
 * T16: decisión de renovación. La toma el cliente desde su enlace; si no responde, el asesor lo llama
 * y la registra por él. Renovar extiende la vigencia un año; no renovar exige el motivo.
 */
export async function decidirRenovacion(solicitudId: number, entrada: unknown, autor = AUTOR_CLIENTE) {
  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    include: { poliza: { include: { propuestaRenovacion: true } } },
  });
  const poliza = solicitud?.poliza;
  const propuesta = poliza?.propuestaRenovacion;
  if (!solicitud || solicitud.estado !== EstadoSolicitud.EMITIDA || !poliza || !propuesta) {
    throw new ErrorDeNegocio(409, "Esta póliza no tiene una propuesta de renovación.");
  }
  if (propuesta.decision) throw new ErrorDeNegocio(409, "La renovación de esta póliza ya fue decidida.");
  const resultado = decisionRenovacionSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));

  const ahora = new Date();
  const porTelefono = autor !== AUTOR_CLIENTE ? " (decisión del cliente registrada por el asesor)" : "";
  if (resultado.data.decision === "RENOVAR") {
    const oferta = (propuesta.ofertas as unknown as OfertaRenovacion[]).find((o) => o.aseguradoraNombre === resultado.data.aseguradora);
    if (!oferta) throw new ErrorValidacion({ aseguradora: "Seleccione una de las ofertas de la propuesta" });
    const siguiente = oferta.esActual ? "pasa al pago" : "pasa a firma con la nueva aseguradora";
    await prisma.$transaction([
      prisma.propuestaRenovacion.update({
        where: { id: propuesta.id },
        data: { decision: "RENOVADA", aseguradoraElegida: oferta.aseguradoraNombre, primaElegida: oferta.primaAnual, decididaEn: ahora, decididaPor: autor },
      }),
      prisma.poliza.update({
        where: { id: poliza.id },
        data: { estadoRenovacion: EstadoRenovacion.RENOVADA, fechaVencimiento: new Date(poliza.fechaVencimiento.getTime() + 365 * DIA_MS) },
      }),
      registrarEvento(prisma, solicitud.id, "RENOVACION", `Póliza ${poliza.numero} renovada con ${oferta.aseguradoraNombre}: ${siguiente}${porTelefono}.`, autor, ahora),
    ]);
  } else {
    const motivo = resultado.data.motivo!;
    await prisma.$transaction([
      prisma.propuestaRenovacion.update({ where: { id: propuesta.id }, data: { decision: "NO_RENOVADA", motivoNoRenovacion: motivo, decididaEn: ahora, decididaPor: autor } }),
      prisma.poliza.update({ where: { id: poliza.id }, data: { estadoRenovacion: EstadoRenovacion.NO_RENOVADA } }),
      registrarEvento(prisma, solicitud.id, "RENOVACION", `El cliente no renueva la póliza ${poliza.numero}. Motivo: ${MOTIVOS_NO_RENOVACION[motivo].toLowerCase()}${porTelefono}.`, autor, ahora),
    ]);
  }
}
