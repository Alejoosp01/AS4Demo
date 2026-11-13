import { randomBytes, randomInt } from "node:crypto";
import { EstadoSolicitud, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { NOMBRES_MOTIVO } from "../catalogos";
import { cotizar, crearAdaptadoresSimulados } from "../cotizacion/motor";
import { ordenarOfertas } from "../cotizacion/ordenarOfertas";
import type { CoberturaOferta } from "../cotizacion/tipos";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { erroresPorCampo } from "../validacion/errores";
import { camposPendientes, limpiarBorrador } from "../validacion/pendientes";
import { validarDatosRamo } from "../validacion/ramos";
import { sarlaftSchema } from "../validacion/sarlaft";
import { VERSION_AUTORIZACION, noInteresSchema, solicitudSchema } from "../validacion/solicitud";
import { AUTOR_CLIENTE, registrarEvento } from "./bitacora";
import { asesorConMenosCarga } from "./seguimiento";
import { siguientePaso } from "./siguientePaso";


const incluir = {
  ofertas: { include: { aseguradora: true } },
  aceptacion: true,
  poliza: { include: { propuestaRenovacion: true } },
  eventos: { orderBy: { creadoEn: "asc" } },
  asesoria: { include: { asesor: true } },
  asesor: true,
} satisfies Prisma.SolicitudInclude;

export type SolicitudCompleta = Prisma.SolicitudGetPayload<{ include: typeof incluir }>;

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
    autorizaDatosVersion: s.autorizaDatosVersion,
    // Mientras faltan datos, el cliente retoma lo que ya escribió y solo se le piden los campos pendientes.
    borrador: s.estado === EstadoSolicitud.NUEVA ? s.borrador : null,
    pendientes: s.estado === EstadoSolicitud.NUEVA ? camposPendientes(s.ramo, s.borrador) : [],
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

/** Vista para el asesor: agrega el siguiente paso, el seguimiento automático y la bitácora. */
export function vistaInterna(s: SolicitudCompleta, hoy = new Date()) {
  return {
    ...vistaSolicitud(s),
    siguientePaso: siguientePaso({
      estado: s.estado,
      alertaAsesorEn: s.alertaAsesorEn,
      tieneAsesoria: Boolean(s.asesoria),
      eleccionSinConfirmar: Boolean(s.aceptacion && !s.aceptacion.confirmadaEn),
      poliza: s.poliza,
    }, hoy),
    seguimiento: { recordatorioEn: s.recordatorioEn, alertaAsesorEn: s.alertaAsesorEn, cerradaEn: s.cerradaEn },
    polizaId: s.poliza?.id ?? null,
    estadoRenovacion: s.poliza?.estadoRenovacion ?? null,
    eventos: s.eventos.map((e) => ({ tipo: e.tipo, detalle: e.detalle, autor: e.autor, creadoEn: e.creadoEn })),
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
  const ahora = new Date();
  return prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitud.create({
      data: {
        ...datos,
        autorizaDatos,
        autorizaDatosEn: ahora,
        autorizaDatosVersion: VERSION_AUTORIZACION,
        token: randomBytes(16).toString("hex"),
      },
    });
    await registrarEvento(tx, solicitud.id, "SOLICITUD",
      `Solicitud recibida con autorización de tratamiento de datos, versión ${VERSION_AUTORIZACION}.`, AUTOR_CLIENTE, ahora);
    return solicitud;
  });
}

function exigirFormularioAbierto(solicitud: SolicitudCompleta) {
  if (solicitud.estado === EstadoSolicitud.CERRADA) {
    throw new ErrorDeNegocio(409, "Esta solicitud se cerró porque no se completaron los datos a tiempo. Puede crear una nueva solicitud.");
  }
  const permitido = solicitud.estado === EstadoSolicitud.NUEVA || solicitud.estado === EstadoSolicitud.COTIZADA;
  if (!permitido || solicitud.aceptacion) throw new ErrorDeNegocio(409, "Esta solicitud ya no admite cambios.");
}

/** Guarda lo que el cliente lleva diligenciado, sin validar, para que lo retome desde el mismo enlace. */
export async function guardarBorrador(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  if (solicitud.estado !== EstadoSolicitud.NUEVA) throw new ErrorDeNegocio(409, "Esta solicitud ya no admite cambios.");
  const borrador = limpiarBorrador(solicitud.ramo, entrada);
  const faltan = camposPendientes(solicitud.ramo, borrador).length;
  await prisma.$transaction(async (tx) => {
    await tx.solicitud.update({ where: { id: solicitud.id }, data: { borrador: borrador as unknown as Prisma.InputJsonValue } });
    // Un solo registro en la bitácora por solicitud, para no llenarla con cada guardado.
    if (!solicitud.borrador) {
      await registrarEvento(tx, solicitud.id, "DATOS_PARCIALES", `El cliente guardó datos parciales del formulario; ${faltan === 1 ? "queda 1 campo pendiente" : `quedan ${faltan} campos pendientes`}.`, AUTOR_CLIENTE);
    }
  });
  return buscarPorToken(token);
}

export async function guardarFormulario(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  exigirFormularioAbierto(solicitud);

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
        borrador: Prisma.DbNull,
        estado: EstadoSolicitud.COTIZADA,
        asesorId: solicitud.asesorId ?? (await asesorConMenosCarga(tx)),
      },
    });
    await registrarEvento(tx, solicitud.id, "COTIZACION",
      `Datos completos y SARLAFT único recibidos. La plataforma cotizó con ${adaptadores.length} aseguradoras y obtuvo ${ofertas.length} ${ofertas.length === 1 ? "oferta" : "ofertas"}.`);
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
    registrarEvento(prisma, solicitud.id, "ELECCION", `El cliente eligió la oferta de ${oferta.aseguradora.nombre}. Se generó el código de confirmación.`, AUTOR_CLIENTE),
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
    registrarEvento(prisma, solicitud.id, "ACEPTACION", "El cliente confirmó la aceptación con el código de seis dígitos.", AUTOR_CLIENTE),
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
    registrarEvento(prisma, solicitud.id, "NO_INTERES", `El cliente indicó que no continúa. Motivo: ${NOMBRES_MOTIVO[resultado.data.motivo].toLowerCase()}.`, AUTOR_CLIENTE),
  ]);
  return buscarPorToken(token);
}
