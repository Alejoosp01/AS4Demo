import { EstadoRenovacion, EstadoSolicitud, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { RAMOS } from "../cotizacion/tipos";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { asesoriaSchema } from "../validacion/asesoria";
import { erroresPorCampo } from "../validacion/errores";
import { emisionSchema, renovacionSchema } from "../validacion/interno";
import { registrarEvento } from "./bitacora";
import { type OfertaRenovacion, ventanaDeRenovacion } from "./renovaciones";
import { type CodigoPaso, diasParaVencer, siguientePaso } from "./siguientePaso";
import { buscarPorId } from "./solicitudes";

const POR_PAGINA = 25;
const ESTADOS = Object.values(EstadoSolicitud) as string[];

interface Filtros {
  q?: string;
  ramo?: string;
  estado?: string;
  asignacion?: string;
  tarea?: string;
  pagina?: string;
}

// Filtros de la bandeja por lo que hay que hacer, no solo por estado.
const TAREAS: Record<string, Prisma.SolicitudWhereInput> = {
  asesorar: { estado: EstadoSolicitud.COTIZADA },
  emitir: { estado: EstadoSolicitud.ACEPTADA },
  contactar: { estado: EstadoSolicitud.NUEVA, alertaAsesorEn: { not: null } },
  cliente: { OR: [{ estado: EstadoSolicitud.ASESORADA }, { estado: EstadoSolicitud.NUEVA, alertaAsesorEn: null }] },
};

const paraPaso = {
  asesor: true,
  asesoria: { select: { id: true } },
  aceptacion: { select: { confirmadaEn: true } },
  poliza: { select: { fechaVencimiento: true, estadoRenovacion: true } },
} satisfies Prisma.SolicitudInclude;

type SolicitudConPaso = Prisma.SolicitudGetPayload<{ include: typeof paraPaso }>;

const pasoDe = (s: SolicitudConPaso, hoy: Date) =>
  siguientePaso({
    estado: s.estado,
    alertaAsesorEn: s.alertaAsesorEn,
    tieneAsesoria: Boolean(s.asesoria),
    eleccionSinConfirmar: Boolean(s.aceptacion && !s.aceptacion.confirmadaEn),
    poliza: s.poliza,
  }, hoy);

export async function bandeja(filtros: Filtros, asesorId: number) {
  const where: Prisma.SolicitudWhereInput = {};
  if (filtros.ramo && (RAMOS as readonly string[]).includes(filtros.ramo)) where.ramo = filtros.ramo as Prisma.SolicitudWhereInput["ramo"];
  if (filtros.estado && ESTADOS.includes(filtros.estado)) where.estado = filtros.estado as EstadoSolicitud;
  if (filtros.asignacion === "mias") where.asesorId = asesorId;
  const condiciones: Prisma.SolicitudWhereInput[] = [];
  if (filtros.tarea && TAREAS[filtros.tarea]) condiciones.push(TAREAS[filtros.tarea]);
  const q = filtros.q?.trim();
  if (q) {
    const numero = Number(q);
    const busqueda: Prisma.SolicitudWhereInput[] = [
      { nombre: { contains: q, mode: "insensitive" } },
      { numeroDocumento: { contains: q } },
      { poliza: { numero: { contains: q, mode: "insensitive" } } },
      ...(Number.isInteger(numero) && numero > 0 && numero < 2_147_483_647 ? [{ id: numero }] : []),
    ];
    condiciones.push({ OR: busqueda });
  }
  if (condiciones.length > 0) where.AND = condiciones;
  const hoy = new Date();
  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const [total, filas] = await Promise.all([
    prisma.solicitud.count({ where }),
    prisma.solicitud.findMany({
      where,
      orderBy: { creadaEn: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: paraPaso,
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
      siguientePaso: (({ codigo, responsable, titulo }) => ({ codigo, responsable, titulo }))(pasoDe(s, hoy)),
    })),
  };
}

const DIA_MS = 24 * 60 * 60 * 1000;
const POR_TAREA = 5;

const dias = (n: number) => (n === 0 ? "hoy" : n === 1 ? "hace 1 día" : `hace ${n} días`);
const diasDesde = (fecha: Date, hoy: Date) => Math.max(0, Math.floor((hoy.getTime() - fecha.getTime()) / DIA_MS));

interface TareaResumen {
  codigo: CodigoPaso;
  titulo: string;
  porque: string;
  accion: string;
  total: number;
  filtro: string;
  elementos: { solicitudId: number; nombre: string; ramo: string; detalle: string; urgente: boolean }[];
}

/**
 * Inicio del asesor: sus solicitudes agrupadas por lo que tiene que hacer, en orden de prioridad.
 * Primero lo que el cliente ya decidió (emitir), luego asesorar, luego los clientes detenidos y las renovaciones.
 */
export async function resumenAsesor(asesorId: number, hoy = new Date()) {
  const mias = { asesorId };
  const { desde, hasta } = ventanaDeRenovacion(hoy);
  const [porEmitir, porAsesorar, porContactar, renovaciones, esperandoCliente] = await Promise.all([
    prisma.solicitud.findMany({ where: { ...mias, ...TAREAS.emitir }, include: { aceptacion: true }, orderBy: { actualizadaEn: "asc" } }),
    prisma.solicitud.findMany({ where: { ...mias, ...TAREAS.asesorar }, include: { _count: { select: { ofertas: true } } }, orderBy: { actualizadaEn: "asc" } }),
    prisma.solicitud.findMany({ where: { ...mias, ...TAREAS.contactar }, orderBy: { creadaEn: "asc" } }),
    prisma.poliza.findMany({
      where: { solicitud: mias, fechaVencimiento: { gte: desde, lt: hasta }, estadoRenovacion: EstadoRenovacion.PENDIENTE },
      include: { solicitud: true },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.solicitud.count({ where: { ...mias, ...TAREAS.cliente } }),
  ]);

  const tareas: TareaResumen[] = [
    {
      codigo: "EMITIR_POLIZA",
      titulo: "Emitir pólizas",
      porque: "El cliente ya aceptó una oferta y espera su póliza.",
      accion: "Emitir",
      total: porEmitir.length,
      filtro: "tarea=emitir&asignacion=mias",
      elementos: porEmitir.slice(0, POR_TAREA).map((s) => {
        const espera = diasDesde(s.aceptacion?.confirmadaEn ?? s.actualizadaEn, hoy);
        return { solicitudId: s.id, nombre: s.nombre, ramo: s.ramo, detalle: `Aceptó ${dias(espera)}`, urgente: espera >= 3 };
      }),
    },
    {
      codigo: "REGISTRAR_ASESORIA",
      titulo: "Registrar asesorías",
      porque: "El comparativo está listo y el cliente espera su recomendación.",
      accion: "Asesorar",
      total: porAsesorar.length,
      filtro: "tarea=asesorar&asignacion=mias",
      elementos: porAsesorar.slice(0, POR_TAREA).map((s) => {
        const espera = diasDesde(s.actualizadaEn, hoy);
        return { solicitudId: s.id, nombre: s.nombre, ramo: s.ramo, detalle: `${s._count.ofertas} ofertas · cotizada ${dias(espera)}`, urgente: espera >= 3 };
      }),
    },
    {
      codigo: "CONTACTAR_CLIENTE",
      titulo: "Contactar clientes detenidos",
      porque: "Llevan más de 48 horas sin completar sus datos; la solicitud se cierra a los cinco días hábiles.",
      accion: "Contactar",
      total: porContactar.length,
      filtro: "tarea=contactar&asignacion=mias",
      elementos: porContactar.slice(0, POR_TAREA).map((s) => ({
        solicitudId: s.id, nombre: s.nombre, ramo: s.ramo, detalle: `Solicitó ${dias(diasDesde(s.creadaEn, hoy))} · ${s.telefono}`, urgente: true,
      })),
    },
    {
      codigo: "GESTIONAR_RENOVACION",
      titulo: "Gestionar renovaciones",
      porque: "Vencen en los próximos 30 días y la plataforma ya envió la propuesta recotizada.",
      accion: "Gestionar",
      total: renovaciones.length,
      filtro: "",
      elementos: renovaciones.slice(0, POR_TAREA).map((p) => {
        const restan = diasParaVencer(p.fechaVencimiento, hoy);
        return { solicitudId: p.solicitudId, nombre: p.solicitud.nombre, ramo: p.solicitud.ramo, detalle: `Póliza ${p.numero} · vence en ${restan} ${restan === 1 ? "día" : "días"}`, urgente: restan <= 7 };
      }),
    },
  ];

  return {
    tareas,
    totalPendientes: tareas.reduce((total, t) => total + t.total, 0),
    esperandoCliente,
  };
}

export async function registrarAsesoria(id: number, asesorId: number, entrada: unknown) {
  const solicitud = await buscarPorId(id);
  if (solicitud.asesoria) throw new ErrorDeNegocio(409, "La asesoría ya fue registrada y no se puede modificar.");
  if (solicitud.estado !== EstadoSolicitud.COTIZADA) throw new ErrorDeNegocio(409, "Solo se registra la asesoría de solicitudes cotizadas.");
  const resultado = asesoriaSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const recomendada = solicitud.ofertas.find((o) => o.id === resultado.data.ofertaRecomendadaId);
  if (!recomendada) throw new ErrorValidacion({ ofertaRecomendadaId: "Seleccione una oferta del comparativo" });
  const asesor = (await prisma.usuario.findUnique({ where: { id: asesorId } }))?.nombre ?? "Asesor";
  await prisma.$transaction([
    prisma.asesoria.create({
      data: { solicitudId: id, asesorId, ofertaRecomendadaId: resultado.data.ofertaRecomendadaId, criterio: resultado.data.criterio },
    }),
    prisma.solicitud.update({ where: { id }, data: { estado: EstadoSolicitud.ASESORADA } }),
    registrarEvento(prisma, id, "ASESORIA", `Asesoría registrada: recomienda ${recomendada.aseguradora.nombre}. El criterio quedó guardado y no se puede modificar.`, asesor),
  ]);
  return buscarPorId(id);
}

export async function emitirPoliza(id: number, asesor: string, entrada: unknown) {
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
    registrarEvento(prisma, id, "EMISION", `Póliza ${resultado.data.numero} emitida.`, asesor),
  ]);
  return buscarPorId(id);
}

export async function renovacionesProximas(dias = 30, hoy = new Date()) {
  const { desde, hasta } = ventanaDeRenovacion(hoy, dias);
  const polizas = await prisma.poliza.findMany({
    where: { fechaVencimiento: { gte: desde, lt: hasta }, estadoRenovacion: EstadoRenovacion.PENDIENTE },
    orderBy: { fechaVencimiento: "asc" },
    include: { solicitud: { include: { asesor: true } }, oferta: { include: { aseguradora: true } }, propuestaRenovacion: true },
  });
  return polizas.map((p) => {
    const ofertas = (p.propuestaRenovacion?.ofertas ?? []) as unknown as OfertaRenovacion[];
    return {
      id: p.id,
      numero: p.numero,
      solicitudId: p.solicitudId,
      tomador: p.solicitud.nombre,
      telefono: p.solicitud.telefono,
      correo: p.solicitud.correo,
      ramo: p.solicitud.ramo,
      aseguradora: p.oferta.aseguradora.nombre,
      primaAnual: p.oferta.primaAnual,
      fechaVencimiento: p.fechaVencimiento,
      diasRestantes: diasParaVencer(p.fechaVencimiento, hoy),
      asesor: p.solicitud.asesor?.nombre ?? null,
      // Recotización automática (T15). La lista ya viene ordenada por cobertura y, a igualdad, menor prima.
      propuesta: p.propuestaRenovacion ? { enviadaEn: p.propuestaRenovacion.enviadaEn, ofertas } : null,
    };
  });
}

export async function marcarRenovacion(polizaId: number, asesor: string, entrada: unknown) {
  const resultado = renovacionSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const poliza = await prisma.poliza.findUnique({ where: { id: polizaId } });
  if (!poliza) throw new ErrorDeNegocio(404, "No encontramos la póliza.");
  const renovada = resultado.data.estado === EstadoRenovacion.RENOVADA;
  await prisma.$transaction([
    prisma.poliza.update({ where: { id: polizaId }, data: { estadoRenovacion: resultado.data.estado } }),
    registrarEvento(prisma, poliza.solicitudId, "RENOVACION", `Póliza ${poliza.numero} marcada como ${renovada ? "renovada" : "no renovada"}.`, asesor),
  ]);
}
