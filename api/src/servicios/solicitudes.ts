import { randomBytes, randomInt } from "node:crypto";
import { EstadoSolicitud, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { FORMAS_PAGO, LISTA_RESTRICTIVA_SIMULADA, NOMBRES_MOTIVO, NOMBRES_RAMO } from "../catalogos";
import { cotizar, crearAdaptadoresSimulados } from "../cotizacion/motor";
import { ordenarOfertas } from "../cotizacion/ordenarOfertas";
import { REVISION_POR_RAMO, evaluarSuscripcion } from "../cotizacion/suscripcion";
import type { CoberturaOferta } from "../cotizacion/tipos";
import { ErrorDeNegocio, ErrorValidacion } from "../errores";
import { erroresPorCampo } from "../validacion/errores";
import { camposPendientes, limpiarBorrador } from "../validacion/pendientes";
import { validarDatosRamo } from "../validacion/ramos";
import { sarlaftSchema } from "../validacion/sarlaft";
import { VERSION_AUTORIZACION, noInteresSchema, pagoSchema, solicitudSchema } from "../validacion/solicitud";
import { AUTOR_CLIENTE, registrarEvento } from "./bitacora";
import { asesorConMenosCarga } from "./seguimiento";
import { siguientePaso } from "./siguientePaso";


const incluir = {
  ofertas: { include: { aseguradora: true } },
  aceptacion: true,
  poliza: { include: { propuestaRenovacion: true, siniestros: { orderBy: { fechaReporte: "desc" } } } },
  pqrs: { orderBy: { fecha: "desc" } },
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
      ciudad: s.ciudad,
    },
    clasificacion: { tipoCliente: s.tipoCliente, tramite: s.tramite },
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
          suscripcion: s.aceptacion.suscritaEn
            ? {
                resultado: s.aceptacion.suscripcionResultado,
                revision: REVISION_POR_RAMO[s.ramo],
                detalle: s.aceptacion.suscripcionDetalle,
                suscritaEn: s.aceptacion.suscritaEn,
                condicionesAceptadasEn: s.aceptacion.condicionesAceptadasEn,
              }
            : null,
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
      ? {
          numero: s.poliza.numero,
          fechaEmision: s.poliza.fechaEmision,
          fechaVencimiento: s.poliza.fechaVencimiento,
          formaPago: s.poliza.formaPago,
          pagadaEn: s.poliza.pagadaEn,
          estadoRenovacion: s.poliza.estadoRenovacion,
        }
      : null,
    siniestros: (s.poliza?.siniestros ?? []).map((x) => ({
      id: x.id, fechaReporte: x.fechaReporte, fechaEvento: x.fechaEvento, lugar: x.lugar, descripcion: x.descripcion, documentos: x.documentos,
      avisoTardio: x.avisoTardio, estado: x.estado, radicadoEn: x.radicadoEn, cerradoEn: x.cerradoEn, resultado: x.resultado, valorPagado: x.valorPagado,
    })),
    pqrs: s.pqrs.map((x) => ({
      id: x.id, tipo: x.tipo, fecha: x.fecha, asunto: x.asunto, descripcion: x.descripcion, estado: x.estado, respuesta: x.respuesta, cerradaEn: x.cerradaEn,
    })),
    // Propuesta de renovación (T15) y decisión del cliente (T16). No lleva comisiones.
    renovacion: s.poliza?.propuestaRenovacion
      ? {
          enviadaEn: s.poliza.propuestaRenovacion.enviadaEn,
          primaActual: s.poliza.propuestaRenovacion.primaActual,
          aseguradoraActual: s.poliza.propuestaRenovacion.aseguradoraActual,
          ofertas: s.poliza.propuestaRenovacion.ofertas,
          decision: s.poliza.propuestaRenovacion.decision,
          aseguradoraElegida: s.poliza.propuestaRenovacion.aseguradoraElegida,
          primaElegida: s.poliza.propuestaRenovacion.primaElegida,
          motivoNoRenovacion: s.poliza.propuestaRenovacion.motivoNoRenovacion,
          decididaEn: s.poliza.propuestaRenovacion.decididaEn,
        }
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
      condicionesPendientes: Boolean(s.aceptacion?.suscripcionResultado === "CON_CONDICIONES" && !s.aceptacion.condicionesAceptadasEn),
      casosAbiertos: (s.poliza?.siniestros ?? []).filter((x) => x.estado !== "CERRADO").length + s.pqrs.filter((x) => x.estado !== "CERRADA").length,
      renovacionDecidida: Boolean(s.poliza?.propuestaRenovacion?.decision),
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
  const { autorizaDatos, autorizaDatosSensibles, ...datos } = resultado.data;
  const ahora = new Date();
  // T02: la plataforma clasifica antes de pedir más datos.
  const tipoCliente = datos.tipoDocumento === "NIT" ? "JURIDICA" : "NATURAL";
  const vigente = await prisma.poliza.findFirst({
    where: { fechaVencimiento: { gte: ahora }, solicitud: { numeroDocumento: datos.numeroDocumento, ramo: datos.ramo } },
  });
  const tramite = vigente ? "RENOVACION" : "NUEVA";
  return prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitud.create({
      data: {
        ...datos,
        tipoCliente,
        tramite,
        autorizaDatosSensibles: autorizaDatosSensibles === true,
        autorizaDatos,
        autorizaDatosEn: ahora,
        autorizaDatosVersion: VERSION_AUTORIZACION,
        token: randomBytes(16).toString("hex"),
      },
    });
    await registrarEvento(tx, solicitud.id, "SOLICITUD",
      `Solicitud recibida con autorización de tratamiento de datos, versión ${VERSION_AUTORIZACION}${autorizaDatosSensibles ? ", incluidos los datos sensibles de salud" : ""}.`, AUTOR_CLIENTE, ahora);
    await registrarEvento(tx, solicitud.id, "CLASIFICACION",
      `Clasificada como persona ${tipoCliente === "JURIDICA" ? "jurídica" : "natural"}, ${tramite === "RENOVACION" ? "renovación (ya tiene póliza vigente en este ramo)" : "póliza nueva"}. Se envió el enlace del formulario de ${NOMBRES_RAMO[datos.ramo]}.`,
      undefined, new Date(ahora.getTime() + 1000));
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

/**
 * T03: el cliente diligencia el SARLAFT único antes de los datos del ramo y la plataforma consulta
 * las listas restrictivas (simulado). Con coincidencia, la solicitud se escala a cumplimiento y no continúa.
 */
export async function guardarSarlaft(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  if (solicitud.estado !== EstadoSolicitud.NUEVA) throw new ErrorDeNegocio(409, "Esta solicitud ya no admite cambios.");
  const resultado = sarlaftSchema.safeParse(entrada ?? {});
  if (!resultado.success) {
    throw new ErrorValidacion(Object.fromEntries(Object.entries(erroresPorCampo(resultado.error)).map(([k, v]) => [`sarlaft.${k}`, v])));
  }
  const previo = limpiarBorrador(solicitud.ramo, solicitud.borrador);
  const borrador = { datosRamo: previo.datosRamo, sarlaft: resultado.data };
  const primeraVez = Object.keys(previo.sarlaft).length === 0;
  const enLista = LISTA_RESTRICTIVA_SIMULADA.includes(solicitud.numeroDocumento);

  await prisma.$transaction(async (tx) => {
    await tx.solicitud.update({
      where: { id: solicitud.id },
      data: {
        borrador: borrador as unknown as Prisma.InputJsonValue,
        ...(enLista ? { estado: EstadoSolicitud.EN_CUMPLIMIENTO, sarlaft: resultado.data as Prisma.InputJsonValue } : {}),
      },
    });
    if (enLista) {
      await registrarEvento(tx, solicitud.id, "CUMPLIMIENTO", "Coincidencia en la consulta de listas restrictivas. La solicitud se escaló a cumplimiento y no continúa a cotización.");
    } else if (primeraVez) {
      await registrarEvento(tx, solicitud.id, "SARLAFT", "SARLAFT único diligenciado. Consulta de listas restrictivas sin coincidencias (simulada).", AUTOR_CLIENTE);
    }
  });
  return buscarPorToken(token);
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

  // T03: consulta de listas restrictivas (simulada). Con coincidencia, la solicitud se escala y no se cotiza.
  if (LISTA_RESTRICTIVA_SIMULADA.includes(solicitud.numeroDocumento)) {
    await prisma.$transaction([
      prisma.solicitud.update({
        where: { id: solicitud.id },
        data: {
          datosRamo: ramo.valor.datos as Prisma.InputJsonValue,
          sarlaft: sarlaft.data as Prisma.InputJsonValue,
          borrador: Prisma.DbNull,
          estado: EstadoSolicitud.EN_CUMPLIMIENTO,
        },
      }),
      registrarEvento(prisma, solicitud.id, "CUMPLIMIENTO", "Coincidencia en la consulta de listas restrictivas. La solicitud se escaló a cumplimiento y no continúa a cotización."),
    ]);
    return buscarPorToken(token);
  }

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
      `SARLAFT único y datos del ramo validados; sin coincidencias en listas restrictivas. La plataforma cotizó con ${adaptadores.length} aseguradoras y obtuvo ${ofertas.length} ${ofertas.length === 1 ? "oferta" : "ofertas"}.`);
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

  const ahora = new Date();
  const elegida = solicitud.ofertas.find((o) => o.id === solicitud.aceptacion!.ofertaId)!;
  // T11: la aseguradora suscribe el riesgo. En el prototipo responde de inmediato con reglas fijas.
  const riesgo = validarDatosRamo(solicitud.ramo, solicitud.datosRamo ?? {});
  const suscripcion = riesgo.ok ? evaluarSuscripcion(riesgo.valor) : { resultado: "ESTANDAR" as const, detalle: "Riesgo aceptado en condiciones estándar." };
  const despues = (ms: number) => new Date(ahora.getTime() + ms);

  await prisma.$transaction([
    prisma.aceptacion.update({
      where: { solicitudId: solicitud.id },
      data: { confirmadaEn: ahora, suscripcionResultado: suscripcion.resultado, suscripcionDetalle: suscripcion.detalle, suscritaEn: despues(2000) },
    }),
    prisma.solicitud.update({ where: { id: solicitud.id }, data: { estado: EstadoSolicitud.ACEPTADA } }),
    registrarEvento(prisma, solicitud.id, "ACEPTACION", "El cliente aceptó la oferta y firmó electrónicamente con el código de seis dígitos.", AUTOR_CLIENTE, ahora),
    registrarEvento(prisma, solicitud.id, "RADICACION", `La plataforma radicó la solicitud y los soportes del ramo ante ${elegida.aseguradora.nombre}.`, undefined, despues(1000)),
    registrarEvento(prisma, solicitud.id, "SUSCRIPCION", `${REVISION_POR_RAMO[solicitud.ramo]}: ${suscripcion.detalle}`, elegida.aseguradora.nombre, despues(2000)),
  ]);
  return buscarPorToken(token);
}

function exigirAceptada(solicitud: SolicitudCompleta) {
  if (solicitud.estado !== EstadoSolicitud.ACEPTADA || !solicitud.aceptacion?.confirmadaEn) {
    throw new ErrorDeNegocio(409, "Esta solicitud no está pendiente de pago.");
  }
  return solicitud.aceptacion;
}

/** T12: el cliente acepta las condiciones de la aseguradora o las rechaza y vuelve al comparativo. */
export async function responderCondiciones(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  const aceptacion = exigirAceptada(solicitud);
  if (aceptacion.suscripcionResultado !== "CON_CONDICIONES" || aceptacion.condicionesAceptadasEn) {
    throw new ErrorDeNegocio(409, "No hay condiciones pendientes por aceptar.");
  }
  const acepta = (entrada as { acepta?: unknown } | null)?.acepta;
  if (typeof acepta !== "boolean") throw new ErrorValidacion({ acepta: "Indique si acepta las condiciones" });

  if (acepta) {
    await prisma.$transaction([
      prisma.aceptacion.update({ where: { solicitudId: solicitud.id }, data: { condicionesAceptadasEn: new Date() } }),
      registrarEvento(prisma, solicitud.id, "CONDICIONES", "El cliente aceptó las condiciones de la aseguradora.", AUTOR_CLIENTE),
    ]);
  } else {
    // Pasa a la siguiente opción: se libera la oferta y el cliente vuelve al comparativo.
    await prisma.$transaction([
      prisma.aceptacion.deleteMany({ where: { solicitudId: solicitud.id } }),
      prisma.oferta.updateMany({ where: { solicitudId: solicitud.id }, data: { elegida: false } }),
      prisma.solicitud.update({ where: { id: solicitud.id }, data: { estado: solicitud.asesoria ? EstadoSolicitud.ASESORADA : EstadoSolicitud.COTIZADA } }),
      registrarEvento(prisma, solicitud.id, "CONDICIONES", "El cliente no aceptó las condiciones de la aseguradora y volvió al comparativo para elegir otra opción.", AUTOR_CLIENTE),
    ]);
  }
  return buscarPorToken(token);
}

const PREFIJO_POLIZA = { AUTOS: "AUT", SALUD: "SAL", VIDA: "VID", HOGAR: "HOG", PYMES: "PYM" } as const;
const ANIO_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * T12 a T14: el cliente paga (pasarela simulada), la aseguradora emite y la plataforma entrega la póliza
 * y registra la venta. Ningún paso depende de que el asesor digite datos.
 */
export async function pagarPrima(token: string, entrada: unknown) {
  const solicitud = await buscarPorToken(token);
  const aceptacion = exigirAceptada(solicitud);
  if (aceptacion.suscripcionResultado === "CON_CONDICIONES" && !aceptacion.condicionesAceptadasEn) {
    throw new ErrorDeNegocio(409, "Primero acepte las condiciones de la aseguradora.");
  }
  const resultado = pagoSchema.safeParse(entrada);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));

  const ahora = new Date();
  const despues = (ms: number) => new Date(ahora.getTime() + ms);
  const elegida = solicitud.ofertas.find((o) => o.id === aceptacion.ofertaId)!;
  const numero = `${PREFIJO_POLIZA[solicitud.ramo]}-${ahora.getFullYear()}-${String(900000 + solicitud.id)}`;
  const forma = FORMAS_PAGO[resultado.data.formaPago as keyof typeof FORMAS_PAGO].toLowerCase();

  await prisma.$transaction([
    prisma.poliza.create({
      data: {
        solicitudId: solicitud.id,
        ofertaId: elegida.id,
        numero,
        fechaEmision: ahora,
        fechaVencimiento: despues(ANIO_MS),
        formaPago: resultado.data.formaPago,
        pagadaEn: ahora,
      },
    }),
    prisma.solicitud.update({ where: { id: solicitud.id }, data: { estado: EstadoSolicitud.EMITIDA } }),
    registrarEvento(prisma, solicitud.id, "PAGO", `Pago de la prima confirmado (${forma}; pasarela simulada).`, AUTOR_CLIENTE, ahora),
    registrarEvento(prisma, solicitud.id, "EMISION", `${elegida.aseguradora.nombre} expidió la póliza ${numero}.`, elegida.aseguradora.nombre, despues(1000)),
    registrarEvento(prisma, solicitud.id, "ENTREGA", `Póliza enviada a ${solicitud.correo} con el resumen de coberturas. Venta y comisión registradas en el CRM (sincronización simulada).`, undefined, despues(2000)),
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
