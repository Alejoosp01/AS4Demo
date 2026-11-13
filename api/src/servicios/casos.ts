import { EstadoSolicitud, TipoPqr } from "@prisma/client";
import { DOCUMENTOS_SINIESTRO, TIPOS_PQR } from "../catalogos";
import { prisma } from "../db";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { erroresPorCampo } from "../validacion/errores";
import { cierreSiniestroSchema, respuestaPqrSchema } from "../validacion/interno";
import { pqrSchema, siniestroSchema } from "../validacion/solicitud";
import { AUTOR_CLIENTE, registrarEvento } from "./bitacora";
import { buscarPorToken } from "./solicitudes";

const DIA_MS = 24 * 60 * 60 * 1000;
// Art. 1075 C. Co.: el aviso del siniestro debe darse dentro de los tres días siguientes.
export const DIAS_AVISO_SINIESTRO = 3;

export function avisoEsTardio(fechaEvento: Date, fechaReporte: Date): boolean {
  return fechaReporte.getTime() - fechaEvento.getTime() > (DIAS_AVISO_SINIESTRO + 1) * DIA_MS;
}

/** Documentos obligatorios del ramo que el cliente no marcó como adjuntos. */
export function documentosFaltantes(ramo: keyof typeof DOCUMENTOS_SINIESTRO, adjuntos: string[]): string[] {
  return DOCUMENTOS_SINIESTRO[ramo].filter((d) => d.obligatorio && !adjuntos.includes(d.codigo)).map((d) => d.nombre);
}

async function polizaVigente(token: string) {
  const solicitud = await buscarPorToken(token);
  if (solicitud.estado !== EstadoSolicitud.EMITIDA || !solicitud.poliza) throw new ErrorDeNegocio(409, "Esta solicitud no tiene una póliza emitida.");
  return { solicitud, poliza: solicitud.poliza };
}

/** T15 (siniestros): el cliente reporta desde la plataforma con los documentos de la lista de su ramo. */
export async function reportarSiniestro(token: string, entrada: unknown) {
  const { solicitud, poliza } = await polizaVigente(token);
  const resultado = siniestroSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const { fechaEvento, lugar, descripcion, documentos } = resultado.data;
  const inicioVigencia = new Date(poliza.fechaEmision);
  inicioVigencia.setHours(0, 0, 0, 0);
  if (fechaEvento < inicioVigencia || fechaEvento > poliza.fechaVencimiento) {
    throw new ErrorValidacion({ fechaEvento: "La fecha del evento está por fuera de la vigencia de la póliza" });
  }
  const faltan = documentosFaltantes(solicitud.ramo, documentos);
  if (faltan.length > 0) throw new ErrorValidacion({ documentos: `Falta adjuntar: ${faltan.join("; ").toLowerCase()}` });

  const ahora = new Date();
  const tardio = avisoEsTardio(fechaEvento, ahora);
  const validos = DOCUMENTOS_SINIESTRO[solicitud.ramo].filter((d) => documentos.includes(d.codigo)).map((d) => d.codigo);
  await prisma.$transaction([
    prisma.siniestro.create({
      data: { polizaId: poliza.id, fechaReporte: ahora, fechaEvento, lugar, descripcion, documentos: validos, avisoTardio: tardio, estado: "REPORTADO" },
    }),
    registrarEvento(prisma, solicitud.id, "SINIESTRO",
      `El cliente reportó un siniestro con ${validos.length} documentos.${tardio ? ` Alerta: el aviso supera los ${DIAS_AVISO_SINIESTRO} días desde el evento.` : ""}`, AUTOR_CLIENTE, ahora),
  ]);
  return buscarPorToken(token);
}

/** T15 (PQR): el cliente radica una petición, queja o reclamo desde la plataforma. */
export async function radicarPqr(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  const resultado = pqrSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const { tipo, descripcion } = resultado.data;
  const nombre = TIPOS_PQR[tipo as keyof typeof TIPOS_PQR];
  await prisma.$transaction([
    prisma.pqr.create({
      data: { ramo: solicitud.ramo, tipo: tipo as TipoPqr, fecha: new Date(), asunto: descripcion.slice(0, 80), descripcion, estado: "ABIERTA", solicitudId: solicitud.id },
    }),
    registrarEvento(prisma, solicitud.id, "PQR", `El cliente radicó una ${nombre.toLowerCase()}.`, AUTOR_CLIENTE),
  ]);
  return buscarPorToken(token);
}

async function siniestroDe(id: number) {
  const siniestro = await prisma.siniestro.findUnique({ where: { id }, include: { poliza: { include: { oferta: { include: { aseguradora: true } } } } } });
  if (!siniestro) throw new ErrorDeNegocio(404, "No encontramos el siniestro.");
  return siniestro;
}

/** T16: el asesor radica la reclamación, ya completa, ante la aseguradora. */
export async function radicarSiniestro(id: number, asesor: string) {
  const siniestro = await siniestroDe(id);
  if (siniestro.estado !== "REPORTADO") throw new ErrorDeNegocio(409, "Este siniestro ya fue radicado.");
  await prisma.$transaction([
    prisma.siniestro.update({ where: { id }, data: { estado: "RADICADO", radicadoEn: new Date() } }),
    registrarEvento(prisma, siniestro.poliza.solicitudId, "SINIESTRO", `Reclamación radicada ante ${siniestro.poliza.oferta.aseguradora.nombre}.`, asesor),
  ]);
  return siniestro.poliza.solicitudId;
}

/** T16: al cerrar, el asesor registra resultado y valor pagado; los días de respuesta se calculan solos. */
export async function cerrarSiniestro(id: number, asesor: string, entrada: unknown) {
  const siniestro = await siniestroDe(id);
  if (siniestro.estado !== "RADICADO") throw new ErrorDeNegocio(409, "Primero radique la reclamación ante la aseguradora.");
  const resultado = cierreSiniestroSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const ahora = new Date();
  const pagado = resultado.data.resultado === "PAGADO";
  const dias = Math.max(0, Math.round((ahora.getTime() - (siniestro.radicadoEn ?? siniestro.fechaReporte).getTime()) / DIA_MS));
  await prisma.$transaction([
    prisma.siniestro.update({
      where: { id },
      data: { estado: "CERRADO", cerradoEn: ahora, resultado: resultado.data.resultado, valorPagado: pagado ? resultado.data.valorPagado : 0 },
    }),
    registrarEvento(prisma, siniestro.poliza.solicitudId, "SINIESTRO",
      `Siniestro cerrado: ${pagado ? `pagado por $ ${(resultado.data.valorPagado ?? 0).toLocaleString("es-CO")}` : "objetado por la aseguradora"}. Respuesta en ${dias} ${dias === 1 ? "día" : "días"}.`, asesor, ahora),
  ]);
  return siniestro.poliza.solicitudId;
}

export async function responderPqr(id: number, asesor: string, entrada: unknown) {
  const pqr = await prisma.pqr.findUnique({ where: { id } });
  if (!pqr || !pqr.solicitudId) throw new ErrorDeNegocio(404, "No encontramos la PQR.");
  if (pqr.estado === "CERRADA") throw new ErrorDeNegocio(409, "Esta PQR ya fue respondida.");
  const resultado = respuestaPqrSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  await prisma.$transaction([
    prisma.pqr.update({ where: { id }, data: { estado: "CERRADA", respuesta: resultado.data.respuesta, cerradaEn: new Date() } }),
    registrarEvento(prisma, pqr.solicitudId, "PQR", `${TIPOS_PQR[pqr.tipo]} respondida y cerrada.`, asesor),
  ]);
  return pqr.solicitudId;
}
