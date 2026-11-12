import { EstadoRenovacion, EstadoSolicitud, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { RAMOS } from "../cotizacion/tipos";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { asesoriaSchema } from "../validacion/asesoria";
import { erroresPorCampo } from "../validacion/errores";
import { emisionSchema, renovacionSchema } from "../validacion/interno";
import { buscarPorId } from "./solicitudes";

const POR_PAGINA = 25;
const ESTADOS = Object.values(EstadoSolicitud) as string[];

interface Filtros {
  q?: string;
  ramo?: string;
  estado?: string;
  asignacion?: string;
  pagina?: string;
}

export async function bandeja(filtros: Filtros, asesorId: number) {
  const where: Prisma.SolicitudWhereInput = {};
  if (filtros.ramo && (RAMOS as readonly string[]).includes(filtros.ramo)) where.ramo = filtros.ramo as Prisma.SolicitudWhereInput["ramo"];
  if (filtros.estado && ESTADOS.includes(filtros.estado)) where.estado = filtros.estado as EstadoSolicitud;
  if (filtros.asignacion === "mias") where.asesorId = asesorId;
  const q = filtros.q?.trim();
  if (q) {
    const numero = Number(q);
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { numeroDocumento: { contains: q } },
      { poliza: { numero: { contains: q, mode: "insensitive" } } },
      ...(Number.isInteger(numero) && numero > 0 && numero < 2_147_483_647 ? [{ id: numero }] : []),
    ];
  }
  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const [total, filas] = await Promise.all([
    prisma.solicitud.count({ where }),
    prisma.solicitud.findMany({
      where,
      orderBy: { creadaEn: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { asesor: true },
    }),
  ]);
  return {
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    solicitudes: filas.map((s) => ({
      id: s.id,
      creadaEn: s.creadaEn,
      nombre: s.nombre,
      tipoDocumento: s.tipoDocumento,
      numeroDocumento: s.numeroDocumento,
      ramo: s.ramo,
      estado: s.estado,
      asesor: s.asesor?.nombre ?? null,
    })),
  };
}

export async function registrarAsesoria(id: number, asesorId: number, entrada: unknown) {
  const solicitud = await buscarPorId(id);
  if (solicitud.asesoria) throw new ErrorDeNegocio(409, "La asesoría ya fue registrada y no se puede modificar.");
  if (solicitud.estado !== EstadoSolicitud.COTIZADA) throw new ErrorDeNegocio(409, "Solo se registra la asesoría de solicitudes cotizadas.");
  const resultado = asesoriaSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  if (!solicitud.ofertas.some((o) => o.id === resultado.data.ofertaRecomendadaId)) {
    throw new ErrorValidacion({ ofertaRecomendadaId: "Seleccione una oferta del comparativo" });
  }
  await prisma.$transaction([
    prisma.asesoria.create({
      data: { solicitudId: id, asesorId, ofertaRecomendadaId: resultado.data.ofertaRecomendadaId, criterio: resultado.data.criterio },
    }),
    prisma.solicitud.update({ where: { id }, data: { estado: EstadoSolicitud.ASESORADA } }),
  ]);
  return buscarPorId(id);
}

export async function emitirPoliza(id: number, entrada: unknown) {
  const solicitud = await buscarPorId(id);
  if (solicitud.estado !== EstadoSolicitud.ACEPTADA || !solicitud.aceptacion?.confirmadaEn) {
    throw new ErrorDeNegocio(409, "Solo se emiten pólizas de solicitudes aceptadas por el cliente.");
  }
  const resultado = emisionSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const existe = await prisma.poliza.findUnique({ where: { numero: resultado.data.numero } });
  if (existe) throw new ErrorValidacion({ numero: "Ya existe una póliza con ese número" });

  await prisma.$transaction([
    prisma.poliza.create({
      data: {
        solicitudId: id,
        ofertaId: solicitud.aceptacion.ofertaId,
        numero: resultado.data.numero,
        fechaEmision: new Date(),
        fechaVencimiento: resultado.data.fechaVencimiento,
      },
    }),
    prisma.solicitud.update({ where: { id }, data: { estado: EstadoSolicitud.EMITIDA } }),
  ]);
  return buscarPorId(id);
}

export async function renovacionesProximas(dias = 30) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy.getTime() + (dias + 1) * 24 * 60 * 60 * 1000);
  const polizas = await prisma.poliza.findMany({
    where: { fechaVencimiento: { gte: hoy, lt: limite }, estadoRenovacion: EstadoRenovacion.PENDIENTE },
    orderBy: { fechaVencimiento: "asc" },
    include: { solicitud: { include: { asesor: true } }, oferta: { include: { aseguradora: true } } },
  });
  return polizas.map((p) => ({
    id: p.id,
    numero: p.numero,
    solicitudId: p.solicitudId,
    tomador: p.solicitud.nombre,
    telefono: p.solicitud.telefono,
    ramo: p.solicitud.ramo,
    aseguradora: p.oferta.aseguradora.nombre,
    primaAnual: p.oferta.primaAnual,
    fechaVencimiento: p.fechaVencimiento,
    diasRestantes: Math.ceil((p.fechaVencimiento.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000)) - 1,
    asesor: p.solicitud.asesor?.nombre ?? null,
  }));
}

export async function marcarRenovacion(polizaId: number, entrada: unknown) {
  const resultado = renovacionSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const poliza = await prisma.poliza.findUnique({ where: { id: polizaId } });
  if (!poliza) throw new ErrorDeNegocio(404, "No encontramos la póliza.");
  await prisma.poliza.update({ where: { id: polizaId }, data: { estadoRenovacion: resultado.data.estado } });
}
