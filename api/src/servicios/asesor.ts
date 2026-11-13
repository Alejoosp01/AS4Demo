import { EstadoRenovacion, EstadoSolicitud, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { RAMOS } from "../cotizacion/tipos";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { asesoriaSchema } from "../validacion/asesoria";
import { erroresPorCampo } from "../validacion/errores";
import { contactoSchema } from "../validacion/interno";
import { registrarEvento } from "./bitacora";
import { type OfertaRenovacion, ventanaDeRenovacion } from "./renovaciones";
import { type CodigoPaso, DIAS_SIN_RESPUESTA_RENOVACION, diasParaVencer, renovacionSinRespuesta, siguientePaso } from "./siguientePaso";
import { buscarPorId } from "./solicitudes";

const POR_PAGINA = 25;
const ESTADOS = Object.values(EstadoSolicitud) as string[];
const DIA_MS = 24 * 60 * 60 * 1000;

interface Filtros {
  q?: string;
  ramo?: string;
  estado?: string;
  asignacion?: string;
  tarea?: string;
  pagina?: string;
}

const CON_CASO_ABIERTO: Prisma.SolicitudWhereInput = {
  OR: [{ poliza: { siniestros: { some: { estado: { not: "CERRADO" } } } } }, { pqrs: { some: { estado: { not: "CERRADA" } } } }],
};

// Filtros de la bandeja por lo que hay que hacer, no solo por estado.
const TAREAS: Record<string, Prisma.SolicitudWhereInput> = {
  casos: { estado: EstadoSolicitud.EMITIDA, ...CON_CASO_ABIERTO },
  asesorar: { estado: EstadoSolicitud.COTIZADA },
  contactar: { estado: EstadoSolicitud.NUEVA, alertaAsesorEn: { not: null } },
  cliente: {
    OR: [
      { estado: { in: [EstadoSolicitud.ASESORADA, EstadoSolicitud.ACEPTADA] } },
      { estado: EstadoSolicitud.NUEVA, alertaAsesorEn: null },
    ],
  },
};

const paraPaso = {
  asesor: true,
  asesoria: { select: { id: true } },
  aceptacion: { select: { confirmadaEn: true, suscripcionResultado: true, condicionesAceptadasEn: true } },
  poliza: {
    select: {
      fechaVencimiento: true,
      estadoRenovacion: true,
      propuestaRenovacion: { select: { enviadaEn: true, decision: true } },
      _count: { select: { siniestros: { where: { estado: { not: "CERRADO" } } } } },
    },
  },
  _count: { select: { pqrs: { where: { estado: { not: "CERRADA" } } } } },
} satisfies Prisma.SolicitudInclude;

type SolicitudConPaso = Prisma.SolicitudGetPayload<{ include: typeof paraPaso }>;

const pasoDe = (s: SolicitudConPaso, hoy: Date) =>
  siguientePaso({
    estado: s.estado,
    alertaAsesorEn: s.alertaAsesorEn,
    tieneAsesoria: Boolean(s.asesoria),
    eleccionSinConfirmar: Boolean(s.aceptacion && !s.aceptacion.confirmadaEn),
    condicionesPendientes: Boolean(s.aceptacion?.suscripcionResultado === "CON_CONDICIONES" && !s.aceptacion.condicionesAceptadasEn),
    casosAbiertos: (s.poliza?._count.siniestros ?? 0) + s._count.pqrs,
    renovacionDecidida: Boolean(s.poliza?.propuestaRenovacion?.decision),
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
      siguientePaso: (({ codigo, responsable, titulo, tarea }) => ({ codigo, responsable, titulo, tarea }))(pasoDe(s, hoy)),
    })),
  };
}

const POR_TAREA = 5;

const dias = (n: number) => (n === 0 ? "hoy" : n === 1 ? "hace 1 día" : `hace ${n} días`);
const diasDesde = (fecha: Date, hoy: Date) => Math.max(0, Math.floor((hoy.getTime() - fecha.getTime()) / DIA_MS));

interface TareaResumen {
  codigo: CodigoPaso;
  tarea: string;
  titulo: string;
  porque: string;
  accion: string;
  total: number;
  filtro: string;
  elementos: { solicitudId: number; nombre: string; ramo: string; detalle: string; urgente: boolean }[];
}

/**
 * Inicio del asesor: solo las tareas que el TO-BE deja a su cargo, en orden de prioridad.
 * Primero los momentos de verdad (siniestros y PQR), luego asesorar, destrabar datos y renovaciones sin respuesta.
 */
export async function resumenAsesor(asesorId: number, hoy = new Date()) {
  const mias = { asesorId };
  const { desde, hasta } = ventanaDeRenovacion(hoy);
  const limiteRespuesta = new Date(hoy.getTime() - DIAS_SIN_RESPUESTA_RENOVACION * DIA_MS);
  const [conCasos, porAsesorar, porContactar, renovaciones, esperandoCliente] = await Promise.all([
    prisma.solicitud.findMany({
      where: { ...mias, ...TAREAS.casos },
      include: { poliza: { include: { siniestros: { where: { estado: { not: "CERRADO" } } } } }, pqrs: { where: { estado: { not: "CERRADA" } } } },
    }),
    prisma.solicitud.findMany({ where: { ...mias, ...TAREAS.asesorar }, include: { _count: { select: { ofertas: true } } }, orderBy: { actualizadaEn: "asc" } }),
    prisma.solicitud.findMany({ where: { ...mias, ...TAREAS.contactar }, orderBy: { creadaEn: "asc" } }),
    prisma.poliza.findMany({
      where: {
        solicitud: mias,
        fechaVencimiento: { gte: desde, lt: hasta },
        estadoRenovacion: EstadoRenovacion.PENDIENTE,
        propuestaRenovacion: { decision: null, enviadaEn: { lte: limiteRespuesta } },
      },
      include: { solicitud: true },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.solicitud.count({ where: { ...mias, ...TAREAS.cliente } }),
  ]);

  const tareas: TareaResumen[] = [
    {
      codigo: "ATENDER_CASO",
      tarea: "T16",
      titulo: "Acompañar siniestros y PQR",
      porque: "Es el momento de verdad: el cliente reportó un caso y necesita que usted lo radique y lo acompañe hasta el cierre.",
      accion: "Atender",
      total: conCasos.length,
      filtro: "tarea=casos&asignacion=mias",
      elementos: conCasos.slice(0, POR_TAREA).map((s) => {
        const siniestros = s.poliza?.siniestros ?? [];
        const primero = [...siniestros.map((x) => x.fechaReporte), ...s.pqrs.map((x) => x.fecha)].sort((a, b) => a.getTime() - b.getTime())[0];
        const que = [siniestros.length > 0 ? (siniestros.length === 1 ? "1 siniestro" : `${siniestros.length} siniestros`) : "", s.pqrs.length > 0 ? `${s.pqrs.length} PQR` : ""].filter(Boolean).join(" y ");
        return { solicitudId: s.id, nombre: s.nombre, ramo: s.ramo, detalle: `${que} · reportado ${dias(diasDesde(primero, hoy))}`, urgente: true };
      }),
    },
    {
      codigo: "REGISTRAR_ASESORIA",
      tarea: "T09",
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
      tarea: "T07",
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
      codigo: "LLAMAR_RENOVACION",
      tarea: "T15",
      titulo: "Llamar por renovaciones sin respuesta",
      porque: "El cliente recibió la propuesta recotizada hace más de cinco días y no ha decidido.",
      accion: "Llamar",
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

/** T07: el contacto del asesor con el cliente queda registrado en la solicitud. */
export async function registrarContacto(id: number, asesor: string, entrada: unknown) {
  const solicitud = await buscarPorId(id);
  const resultado = contactoSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  await registrarEvento(prisma, solicitud.id, "CONTACTO", `Contacto con el cliente: ${resultado.data.nota}`, asesor);
  return buscarPorId(id);
}

export async function renovacionesProximas(diasVentana = 30, hoy = new Date()) {
  const { desde, hasta } = ventanaDeRenovacion(hoy, diasVentana);
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
      token: p.solicitud.token,
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
      propuesta: p.propuestaRenovacion
        ? { enviadaEn: p.propuestaRenovacion.enviadaEn, sinRespuesta: renovacionSinRespuesta(p.propuestaRenovacion.enviadaEn, hoy), ofertas }
        : null,
    };
  });
}
