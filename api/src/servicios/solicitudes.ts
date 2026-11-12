import { randomBytes, randomInt } from "node:crypto";
import { EstadoSolicitud, Prisma, Rol } from "@prisma/client";
import { prisma } from "../db";
import { cotizar, crearAdaptadoresSimulados } from "../cotizacion/motor";
import { ordenarOfertas } from "../cotizacion/ordenarOfertas";
import type { CoberturaOferta } from "../cotizacion/tipos";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { erroresPorCampo } from "../validacion/errores";
import { validarDatosRamo } from "../validacion/ramos";
import { sarlaftSchema } from "../validacion/sarlaft";
import { noInteresSchema, solicitudSchema } from "../validacion/solicitud";

const incluir = {
  ofertas: { include: { aseguradora: true } },
  aceptacion: true,
  poliza: true,
  asesoria: { include: { asesor: true } },
  asesor: true,
} satisfies Prisma.SolicitudInclude;

export type SolicitudCompleta = Prisma.SolicitudGetPayload<{ include: typeof incluir }>;

const ESTADOS_ABIERTOS: EstadoSolicitud[] = [EstadoSolicitud.NUEVA, EstadoSolicitud.COTIZADA, EstadoSolicitud.ASESORADA];
const ESTADOS_CON_COMPARATIVO: EstadoSolicitud[] = [EstadoSolicitud.COTIZADA, EstadoSolicitud.ASESORADA];

export function numeroConstancia(id: number, fecha: Date): string {
  return `AS4-${fecha.getFullYear()}-${String(id).padStart(6, "0")}`;
}

/** Vista de la solicitud. Nunca incluye la comisión de las aseguradoras. */
export function vistaSolicitud(s: SolicitudCompleta) {
  const ofertas = ordenarOfertas(
    s.ofertas.map((o) => ({
      id: o.id,
      aseguradoraNombre: o.aseguradora.nombre,
      primaAnual: o.primaAnual,
      deducible: o.deducible,
      coberturas: o.coberturas as unknown as CoberturaOferta[],
      puntajeCobertura: o.puntajeCobertura,
      elegida: o.elegida,
    })),
  );
  const confirmada = s.aceptacion?.confirmadaEn ?? null;
  return {
    id: s.id,
    token: s.token,
    ramo: s.ramo,
    estado: s.estado,
    creadaEn: s.creadaEn,
    tomador: {
      nombre: s.nombre,
      tipoDocumento: s.tipoDocumento,
      numeroDocumento: s.numeroDocumento,
      correo: s.correo,
      telefono: s.telefono,
    },
    autorizaDatosEn: s.autorizaDatosEn,
    datosRamo: s.datosRamo,
    sarlaft: s.sarlaft,
    ofertas,
    noInteres: s.motivoNoInteres ? { motivo: s.motivoNoInteres, detalle: s.detalleNoInteres } : null,
    aceptacion: s.aceptacion
      ? {
          ofertaId: s.aceptacion.ofertaId,
          // Código simulado: en producción se enviaría por SMS y no saldría en la respuesta.
          codigo: confirmada ? null : s.aceptacion.codigo,
          confirmadaEn: confirmada,
          constancia: confirmada ? numeroConstancia(s.id, confirmada) : null,
        }
      : null,
    asesoria: s.asesoria
      ? {
          asesor: s.asesoria.asesor.nombre,
          ofertaRecomendadaId: s.asesoria.ofertaRecomendadaId,
          criterio: s.asesoria.criterio,
          creadaEn: s.asesoria.creadaEn,
        }
      : null,
    poliza: s.poliza
      ? { numero: s.poliza.numero, fechaEmision: s.poliza.fechaEmision, fechaVencimiento: s.poliza.fechaVencimiento }
      : null,
    asesor: s.asesor?.nombre ?? null,
  };
}

export async function buscarPorToken(token: string): Promise<SolicitudCompleta> {
  const solicitud = await prisma.solicitud.findUnique({ where: { token }, include: incluir });
  if (!solicitud) throw new ErrorDeNegocio(404, "No encontramos la solicitud. Revise el enlace.");
  return solicitud;
}

export async function buscarPorId(id: number): Promise<SolicitudCompleta> {
  const solicitud = await prisma.solicitud.findUnique({ where: { id }, include: incluir });
  if (!solicitud) throw new ErrorDeNegocio(404, "No encontramos la solicitud.");
  return solicitud;
}

export async function crearSolicitud(entrada: unknown) {
  const resultado = solicitudSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const { autorizaDatos, ...datos } = resultado.data;
  return prisma.solicitud.create({
    data: { ...datos, autorizaDatos, autorizaDatosEn: new Date(), token: randomBytes(16).toString("hex") },
  });
}

// Reparto equilibrado: la solicitud va al asesor con menos solicitudes abiertas.
async function asesorConMenosCarga(tx: Prisma.TransactionClient): Promise<number | null> {
  const asesores = await tx.usuario.findMany({
    where: { rol: Rol.ASESOR },
    select: { id: true, _count: { select: { solicitudes: { where: { estado: { in: ESTADOS_ABIERTOS } } } } } },
    orderBy: { id: "asc" },
  });
  if (asesores.length === 0) return null;
  return asesores.reduce((menor, a) => (a._count.solicitudes < menor._count.solicitudes ? a : menor)).id;
}

export async function guardarFormulario(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  const permitido = solicitud.estado === EstadoSolicitud.NUEVA || solicitud.estado === EstadoSolicitud.COTIZADA;
  if (!permitido || solicitud.aceptacion) throw new ErrorDeNegocio(409, "Esta solicitud ya no admite cambios.");

  const cuerpo = (entrada ?? {}) as { datosRamo?: unknown; sarlaft?: unknown };
  const ramo = validarDatosRamo(solicitud.ramo, cuerpo.datosRamo ?? {});
  const sarlaft = sarlaftSchema.safeParse(cuerpo.sarlaft ?? {});
  const errores = {
    ...(ramo.ok ? {} : Object.fromEntries(Object.entries(ramo.errores).map(([k, v]) => [`datosRamo.${k}`, v]))),
    ...(sarlaft.success ? {} : Object.fromEntries(Object.entries(erroresPorCampo(sarlaft.error)).map(([k, v]) => [`sarlaft.${k}`, v]))),
  };
  if (!ramo.ok || !sarlaft.success) throw new ErrorValidacion(errores);

  const activas = await prisma.aseguradora.findMany({ where: { activa: true } });
  const idPorCodigo = new Map(activas.map((a) => [a.codigo, a.id]));
  const adaptadores = crearAdaptadoresSimulados().filter((a) => idPorCodigo.has(a.codigo));
  const ofertas = await cotizar(ramo.valor, adaptadores);

  await prisma.$transaction(async (tx) => {
    await tx.oferta.deleteMany({ where: { solicitudId: solicitud.id } });
    await tx.oferta.createMany({
      data: ofertas.map((o) => ({
        solicitudId: solicitud.id,
        aseguradoraId: idPorCodigo.get(o.aseguradoraCodigo)!,
        primaAnual: o.primaAnual,
        deducible: o.deducible,
        coberturas: o.coberturas as unknown as Prisma.InputJsonValue,
        puntajeCobertura: o.puntajeCobertura,
      })),
    });
    await tx.solicitud.update({
      where: { id: solicitud.id },
      data: {
        datosRamo: ramo.valor.datos as Prisma.InputJsonValue,
        sarlaft: sarlaft.data as Prisma.InputJsonValue,
        estado: EstadoSolicitud.COTIZADA,
        asesorId: solicitud.asesorId ?? (await asesorConMenosCarga(tx)),
      },
    });
  });
  return buscarPorToken(token);
}

function exigirComparativoAbierto(solicitud: SolicitudCompleta) {
  if (!ESTADOS_CON_COMPARATIVO.includes(solicitud.estado) || solicitud.aceptacion?.confirmadaEn) {
    throw new ErrorDeNegocio(409, "Esta solicitud ya no admite cambios.");
  }
}

export async function elegirOferta(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  exigirComparativoAbierto(solicitud);
  const ofertaId = Number((entrada as { ofertaId?: unknown } | null)?.ofertaId);
  const oferta = solicitud.ofertas.find((o) => o.id === ofertaId);
  if (!oferta) throw new ErrorValidacion({ ofertaId: "Seleccione una de las ofertas del comparativo" });

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.$transaction([
    prisma.oferta.updateMany({ where: { solicitudId: solicitud.id }, data: { elegida: false } }),
    prisma.oferta.update({ where: { id: oferta.id }, data: { elegida: true } }),
    prisma.aceptacion.upsert({
      where: { solicitudId: solicitud.id },
      create: { solicitudId: solicitud.id, ofertaId: oferta.id, codigo },
      update: { ofertaId: oferta.id, codigo, generadaEn: new Date() },
    }),
  ]);
  process.stdout.write(`Código de confirmación de la solicitud ${solicitud.id}: ${codigo}\n`);
  return buscarPorToken(token);
}

export async function cancelarEleccion(token: string) {
  const solicitud = await buscarPorToken(token);
  exigirComparativoAbierto(solicitud);
  await prisma.$transaction([
    prisma.aceptacion.deleteMany({ where: { solicitudId: solicitud.id } }),
    prisma.oferta.updateMany({ where: { solicitudId: solicitud.id }, data: { elegida: false } }),
  ]);
  return buscarPorToken(token);
}

export async function confirmarAceptacion(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  exigirComparativoAbierto(solicitud);
  if (!solicitud.aceptacion) throw new ErrorDeNegocio(409, "Primero elija una oferta del comparativo.");
  const codigo = String((entrada as { codigo?: unknown } | null)?.codigo ?? "").trim();
  if (!/^\d{6}$/.test(codigo)) throw new ErrorValidacion({ codigo: "Escriba el código de 6 dígitos" });
  if (codigo !== solicitud.aceptacion.codigo) throw new ErrorValidacion({ codigo: "El código no coincide. Revíselo e intente de nuevo" });

  await prisma.$transaction([
    prisma.aceptacion.update({ where: { solicitudId: solicitud.id }, data: { confirmadaEn: new Date() } }),
    prisma.solicitud.update({ where: { id: solicitud.id }, data: { estado: EstadoSolicitud.ACEPTADA } }),
  ]);
  return buscarPorToken(token);
}

export async function registrarNoInteres(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  exigirComparativoAbierto(solicitud);
  const resultado = noInteresSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));

  await prisma.$transaction([
    prisma.aceptacion.deleteMany({ where: { solicitudId: solicitud.id } }),
    prisma.oferta.updateMany({ where: { solicitudId: solicitud.id }, data: { elegida: false } }),
    prisma.solicitud.update({
      where: { id: solicitud.id },
      data: {
        estado: EstadoSolicitud.NO_INTERESADA,
        motivoNoInteres: resultado.data.motivo,
        detalleNoInteres: resultado.data.detalle || null,
      },
    }),
  ]);
  return buscarPorToken(token);
}
