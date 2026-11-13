import {
  EstadoRenovacion,
  EstadoSolicitud,
  MotivoNoInteres,
  Prisma,
  PrismaClient,
  Ramo,
  Rol,
  TipoPqr,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { cotizar, crearAdaptadoresSimulados } from "../src/cotizacion/motor";
import {
  ACTIVIDADES_PYMES,
  ASEGURADORAS,
  CIUDADES,
  OCUPACIONES,
  TIPOS_INMUEBLE,
  USOS_VEHICULO,
  claves,
} from "../src/cotizacion/tarifas.config";
import type { Oferta } from "../src/cotizacion/tipos";
import { digitoVerificacionNit } from "../src/validacion/nit";
import { validarDatosRamo } from "../src/validacion/ramos";
import { sarlaftSchema } from "../src/validacion/sarlaft";
import { NOMBRES_MOTIVO } from "../src/catalogos";
import { AUTOR_CLIENTE, AUTOR_PLATAFORMA, type TipoEvento } from "../src/servicios/bitacora";
import { VERSION_AUTORIZACION } from "../src/validacion/solicitud";

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(4004);
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const addDays = (base: Date, days: number) => new Date(base.getTime() + days * DAY_MS);
const toJson = (value: unknown) => value as Prisma.InputJsonValue;

const USUARIOS = [
  { nombre: "Laura Restrepo Gómez", correo: "laura.restrepo@as4.example", clave: "Asesor2026*", rol: Rol.ASESOR },
  { nombre: "Camilo Vargas Peña", correo: "camilo.vargas@as4.example", clave: "Asesor2026*", rol: Rol.ASESOR },
  { nombre: "Marta Lucía Ospina", correo: "gerencia@as4.example", clave: "Gerencia2026*", rol: Rol.GERENTE },
];

const COMISIONES: Record<string, number> = {
  andina: 12.5,
  valle: 15,
  sabana: 10,
  cordillera: 18,
  litoral: 14,
  altiplano: 11,
  macarena: 16,
  guatavita: 13,
};

const NOMBRES = ["Andrés", "Carolina", "Juan Pablo", "Natalia", "Santiago", "Paola", "Felipe", "Diana", "Jorge", "Luisa", "Mauricio", "Valentina", "Óscar", "Adriana", "Sebastián", "Claudia", "Ricardo", "Marcela", "Germán", "Yolanda"];
const APELLIDOS = ["Rodríguez", "Martínez", "García", "López", "Hernández", "Ramírez", "Torres", "Castro", "Moreno", "Jiménez", "Rojas", "Suárez", "Cárdenas", "Mejía", "Quintero", "Salazar", "Giraldo", "Beltrán", "Arango", "Pineda"];
const EMPRESAS = ["Distribuciones El Roble S.A.S.", "Panadería La Espiga", "Soluciones Integrales del Norte S.A.S.", "Confecciones Marbella", "Ferretería El Tornillo", "Transportes Río Claro S.A.S."];
const ORIGEN_FONDOS = ["Salario", "Actividad comercial", "Honorarios", "Pensión"];

const CRITERIOS = [
  "Se recomienda la oferta con mayor número de amparos porque el cliente prioriza la protección frente a terceros y el valor de la prima es cercano al promedio.",
  "El cliente pidió el menor deducible posible. La oferta recomendada conserva los amparos básicos y tiene el deducible más bajo del comparativo.",
  "Se sugiere la oferta que incluye asistencia porque el cliente viaja con frecuencia por carretera. La diferencia de prima frente a la más económica es menor al 8 %.",
  "La oferta recomendada cubre terremoto, que es obligatorio para el crédito hipotecario del cliente. Las demás no lo incluyen o lo limitan.",
  "Por el tamaño de la nómina se recomienda la oferta con manejo global comercial y lucro cesante, aunque no sea la de menor prima.",
];

const DETALLES_OTRO = [
  "Va a esperar la renovación de su póliza actual para comparar.",
  "La empresa aplazó la decisión para el siguiente trimestre.",
  "Prefiere contratar directamente con su banco.",
];

const SINIESTROS: Record<Ramo, string[]> = {
  AUTOS: ["Choque simple en vía urbana", "Hurto de espejos y accesorios", "Daño de parabrisas", "Colisión con pérdida parcial"],
  SALUD: ["Hospitalización por cirugía programada", "Atención de urgencias", "Reembolso de consulta con especialista"],
  VIDA: ["Reclamación por enfermedad grave", "Reclamación por incapacidad total y permanente"],
  HOGAR: ["Daño por rotura de tubería", "Hurto de contenidos", "Daño eléctrico en electrodomésticos"],
  PYMES: ["Hurto de mercancía", "Daño de equipo electrónico", "Reclamación de responsabilidad civil de un tercero"],
};

const ASUNTOS_PQR: Record<TipoPqr, string[]> = {
  PETICION: ["Solicitud de certificado de la póliza", "Cambio de dirección de correspondencia", "Solicitud de copia de las condiciones generales"],
  QUEJA: ["Demora en la respuesta del asesor", "Demora en la entrega de la póliza", "Inconformidad con la atención telefónica"],
  RECLAMO: ["Cobro de prima no reconocido", "Demora en el pago de un siniestro", "Error en los datos del asegurado"],
};

const PREFIJO_POLIZA: Record<Ramo, string> = { AUTOS: "AUT", SALUD: "SAL", VIDA: "VID", HOGAR: "HOG", PYMES: "PYM" };

const RAMOS_PONDERADOS: Ramo[] = [
  ...Array<Ramo>(14).fill(Ramo.AUTOS),
  ...Array<Ramo>(8).fill(Ramo.SALUD),
  ...Array<Ramo>(6).fill(Ramo.VIDA),
  ...Array<Ramo>(7).fill(Ramo.HOGAR),
  ...Array<Ramo>(5).fill(Ramo.PYMES),
];

function buildToken() {
  let token = "";
  for (let i = 0; i < 24; i += 1) token += Math.floor(random() * 16).toString(16);
  return token;
}

function buildPlaca() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  let placa = "";
  for (let i = 0; i < 3; i += 1) placa += letters[Math.floor(random() * letters.length)];
  return `${placa}${between(100, 999)}`;
}

function buildNit() {
  const numero = `9${between(10_000_000, 99_999_999)}`;
  return `${numero}-${digitoVerificacionNit(numero)}`;
}

function buildDatosRamo(ramo: Ramo): unknown {
  switch (ramo) {
    case Ramo.AUTOS:
      return { placa: buildPlaca(), modelo: between(2012, 2026), ciudad: pick(claves(CIUDADES)), uso: pick([...claves(USOS_VEHICULO), "particular"]) };
    case Ramo.SALUD:
      return { edades: Array.from({ length: between(1, 4) }, () => between(2, 68)), preexistencias: random() < 0.25 };
    case Ramo.VIDA:
      return { edad: between(24, 62), ocupacion: pick(claves(OCUPACIONES)), valorAsegurado: between(8, 50) * 10_000_000 };
    case Ramo.HOGAR:
      return {
        direccion: `Calle ${between(10, 170)} # ${between(5, 80)}-${between(10, 99)}, ${CIUDADES[pick(claves(CIUDADES))].nombre}`,
        tipoInmueble: pick([...claves(TIPOS_INMUEBLE), "apartamento"]),
        valorContenidos: between(3, 20) * 10_000_000,
      };
    case Ramo.PYMES:
      return {
        nit: buildNit(),
        actividad: pick(claves(ACTIVIDADES_PYMES)),
        ingresosAnuales: between(30, 400) * 10_000_000,
        numeroEmpleados: between(3, 85),
      };
  }
}

function buildSarlaft(ramo: Ramo) {
  return sarlaftSchema.parse({
    ocupacion: ramo === Ramo.PYMES ? "Representante legal" : OCUPACIONES[pick(claves(OCUPACIONES))].nombre,
    ingresosMensuales: between(25, 180) * 100_000,
    egresosMensuales: between(10, 90) * 100_000,
    origenFondos: pick(ORIGEN_FONDOS),
    personaExpuestaPoliticamente: false,
    declaraOrigenLicito: true,
  });
}

/** Formulario a medio diligenciar: los datos válidos del ramo y del SARLAFT, sin los campos indicados. */
function buildBorrador(ramo: Ramo, sinDiligenciar: string[]) {
  const completo: Record<string, Record<string, unknown>> = {
    datosRamo: buildDatosRamo(ramo) as Record<string, unknown>,
    sarlaft: buildSarlaft(ramo),
  };
  for (const campo of sinDiligenciar) {
    const [seccion, clave] = campo.split(".");
    delete completo[seccion][clave];
  }
  return completo;
}

interface SolicitudPlan {
  ramo: Ramo;
  estado: EstadoSolicitud;
  creadaEn: Date;
  // Campos que el cliente dejó sin diligenciar; solo aplica a las solicitudes nuevas.
  sinDiligenciar?: "todo" | string[];
  poliza?: { fechaEmision: Date; fechaVencimiento: Date; estadoRenovacion: EstadoRenovacion };
}

interface PolizaCreada {
  id: number;
  ramo: Ramo;
  fechaEmision: Date;
  fechaVencimiento: Date;
}

function buildPlans(today: Date): SolicitudPlan[] {
  const plans: SolicitudPlan[] = [];

  const recientes: [EstadoSolicitud, number, number, number][] = [
    [EstadoSolicitud.COTIZADA, 5, 2, 20],
    [EstadoSolicitud.ASESORADA, 4, 5, 40],
  ];
  for (const [estado, cantidad, minDias, maxDias] of recientes) {
    for (let i = 0; i < cantidad; i += 1) {
      plans.push({ ramo: pick(RAMOS_PONDERADOS), estado, creadaEn: addDays(today, -between(minDias, maxDias)) });
    }
  }

  // Solicitudes con datos pendientes en cada tramo del seguimiento: sin aviso, con recordatorio (24 h),
  // con alerta al asesor (48 h) y vencidas (cinco días hábiles). El seguimiento las procesa al arrancar.
  const pendientes: [number, "todo" | string[]][] = [
    [3, "todo"],
    [30, ["sarlaft.ingresosMensuales", "sarlaft.egresosMensuales", "sarlaft.declaraOrigenLicito"]],
    [54, ["sarlaft.declaraOrigenLicito"]],
    [76, "todo"],
    [100, ["sarlaft.ocupacion", "sarlaft.origenFondos", "sarlaft.personaExpuestaPoliticamente", "sarlaft.declaraOrigenLicito"]],
    [11 * 24, "todo"],
  ];
  const ahora = new Date();
  for (const [horas, sinDiligenciar] of pendientes) {
    plans.push({ ramo: pick(RAMOS_PONDERADOS), estado: EstadoSolicitud.NUEVA, creadaEn: new Date(ahora.getTime() - horas * 60 * 60 * 1000), sinDiligenciar });
  }

  const cerradas: EstadoSolicitud[] = [
    ...Array<EstadoSolicitud>(5).fill(EstadoSolicitud.ACEPTADA),
    ...Array<EstadoSolicitud>(8).fill(EstadoSolicitud.NO_INTERESADA),
    ...Array<EstadoSolicitud>(12).fill(EstadoSolicitud.EMITIDA),
  ];
  cerradas.forEach((estado, index) => {
    // Se intercalan los estados para que cada uno quede repartido en los seis meses.
    const posicion = (index * 7) % cerradas.length;
    const diasAtras = estado === EstadoSolicitud.ACEPTADA
      ? between(3, 25)
      : 12 + Math.floor((posicion * 160) / cerradas.length) + between(0, 5);
    const creadaEn = addDays(today, -diasAtras);
    const plan: SolicitudPlan = { ramo: pick(RAMOS_PONDERADOS), estado, creadaEn };
    if (estado === EstadoSolicitud.EMITIDA) {
      const fechaEmision = addDays(creadaEn, between(4, 10));
      plan.poliza = { fechaEmision, fechaVencimiento: addDays(fechaEmision, 365), estadoRenovacion: EstadoRenovacion.PENDIENTE };
    }
    plans.push(plan);
  });

  // Cartera emitida hace un año: da contenido a la tasa de renovación y a la lista de vencimientos.
  for (let i = 0; i < 18; i += 1) {
    const fechaVencimiento = addDays(today, -(5 + i * 10));
    plans.push({
      ramo: pick(RAMOS_PONDERADOS),
      estado: EstadoSolicitud.EMITIDA,
      creadaEn: addDays(fechaVencimiento, -377),
      poliza: {
        fechaEmision: addDays(fechaVencimiento, -365),
        fechaVencimiento,
        estadoRenovacion: random() < 0.7 ? EstadoRenovacion.RENOVADA : EstadoRenovacion.NO_RENOVADA,
      },
    });
  }
  for (const dias of [3, 9, 14, 21, 27]) {
    const fechaVencimiento = addDays(today, dias);
    plans.push({
      ramo: pick(RAMOS_PONDERADOS),
      estado: EstadoSolicitud.EMITIDA,
      creadaEn: addDays(fechaVencimiento, -377),
      poliza: { fechaEmision: addDays(fechaVencimiento, -365), fechaVencimiento, estadoRenovacion: EstadoRenovacion.PENDIENTE },
    });
  }

  return plans;
}

async function seed(tx: Prisma.TransactionClient, claveHashes: string[], today: Date) {
  const asesorIds: number[] = [];
  for (const [index, usuario] of USUARIOS.entries()) {
    const created = await tx.usuario.create({
      data: { nombre: usuario.nombre, correo: usuario.correo, claveHash: claveHashes[index], rol: usuario.rol },
    });
    if (usuario.rol === Rol.ASESOR) asesorIds.push(created.id);
  }

  const aseguradoraIds = new Map<string, number>();
  for (const aseguradora of ASEGURADORAS) {
    const created = await tx.aseguradora.create({
      data: { codigo: aseguradora.codigo, nombre: aseguradora.nombre, comisionPct: COMISIONES[aseguradora.codigo] },
    });
    aseguradoraIds.set(aseguradora.codigo, created.id);
  }

  const porAnio = new Map<number, ReturnType<typeof crearAdaptadoresSimulados>>();
  const adaptadoresDe = (anio: number) => {
    if (!porAnio.has(anio)) porAnio.set(anio, crearAdaptadoresSimulados(anio));
    return porAnio.get(anio)!;
  };
  const polizas: PolizaCreada[] = [];
  const solicitudIds: { id: number; ramo: Ramo }[] = [];
  let consecutivoPoliza = 1200;
  const turnos = new Map<EstadoSolicitud, number>();

  for (const plan of buildPlans(today)) {
    const nombre = plan.ramo === Ramo.PYMES ? pick(EMPRESAS) : `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
    const tieneFormulario = plan.estado !== EstadoSolicitud.NUEVA;
    // Se alternan los asesores dentro de cada estado para que ambos tengan tareas de todos los tipos.
    const turno = turnos.get(plan.estado) ?? 0;
    turnos.set(plan.estado, turno + 1);
    const asesorId = tieneFormulario ? asesorIds[turno % asesorIds.length] : null;
    const motivo = plan.estado === EstadoSolicitud.NO_INTERESADA
      ? pick([MotivoNoInteres.PRECIO, MotivoNoInteres.PRECIO, MotivoNoInteres.PRECIO, MotivoNoInteres.COBERTURA, MotivoNoInteres.COBERTURA, MotivoNoInteres.YA_TENGO_SEGURO, MotivoNoInteres.LO_VOY_A_PENSAR, MotivoNoInteres.OTRO])
      : null;

    let cotizable = null;
    if (tieneFormulario) {
      const validacion = validarDatosRamo(plan.ramo, buildDatosRamo(plan.ramo));
      if (!validacion.ok) throw new Error(`Datos de ejemplo inválidos en ${plan.ramo}: ${JSON.stringify(validacion.errores)}`);
      cotizable = validacion.valor;
    }

    const solicitud = await tx.solicitud.create({
      data: {
        token: buildToken(),
        ramo: plan.ramo,
        estado: plan.estado,
        nombre,
        tipoDocumento: plan.ramo === Ramo.PYMES ? "NIT" : "CC",
        numeroDocumento: String(between(10_000_000, 1_150_000_000)),
        correo: `cliente${between(1000, 9999)}@correo.example`,
        telefono: `3${between(0, 2)}${between(0, 9)}${between(1_000_000, 9_999_999)}`,
        autorizaDatos: true,
        autorizaDatosEn: plan.creadaEn,
        autorizaDatosVersion: VERSION_AUTORIZACION,
        borrador: Array.isArray(plan.sinDiligenciar) ? toJson(buildBorrador(plan.ramo, plan.sinDiligenciar)) : undefined,
        datosRamo: cotizable ? toJson(cotizable.datos) : undefined,
        sarlaft: tieneFormulario ? toJson(buildSarlaft(plan.ramo)) : undefined,
        motivoNoInteres: motivo,
        detalleNoInteres: motivo === MotivoNoInteres.OTRO ? pick(DETALLES_OTRO) : null,
        asesorId,
        creadaEn: plan.creadaEn,
        // La última novedad de las solicitudes de ejemplo ocurrió poco después de recibirlas, no hoy.
        actualizadaEn: tieneFormulario ? addDays(plan.creadaEn, plan.estado === EstadoSolicitud.COTIZADA ? 0.05 : 2) : plan.creadaEn,
      },
    });
    solicitudIds.push({ id: solicitud.id, ramo: plan.ramo });

    const evento = (tipo: TipoEvento, detalle: string, autor: string, dias: number) =>
      tx.evento.create({ data: { solicitudId: solicitud.id, tipo, detalle, autor, creadoEn: new Date(plan.creadaEn.getTime() + dias * DAY_MS) } });
    await evento("SOLICITUD", `Solicitud recibida con autorización de tratamiento de datos, versión ${VERSION_AUTORIZACION}.`, AUTOR_CLIENTE, 0);
    if (Array.isArray(plan.sinDiligenciar)) {
      const faltan = plan.sinDiligenciar.length;
      await evento("DATOS_PARCIALES", `El cliente guardó datos parciales del formulario; ${faltan === 1 ? "queda 1 campo pendiente" : `quedan ${faltan} campos pendientes`}.`, AUTOR_CLIENTE, 0.01);
    }

    if (!cotizable || asesorId === null) continue;

    const ofertas: (Oferta & { id: number })[] = [];
    // Cada solicitud se cotiza con las tarifas del año en que se recibió: así la recotización de la
    // renovación refleja, en autos, que el vehículo tiene un año más.
    const adaptadores = adaptadoresDe(plan.creadaEn.getFullYear());
    // Las pólizas de la cartera se vendieron con la tarifa del año anterior, que en estos datos de ejemplo
    // era un 6 % más baja. Así la propuesta de renovación muestra un cambio de prima.
    const tarifaAnterior = plan.creadaEn.getFullYear() < today.getFullYear() ? 1 / 1.06 : 1;
    for (const cotizada of await cotizar(cotizable, adaptadores)) {
      const oferta = { ...cotizada, primaAnual: Math.round((cotizada.primaAnual * tarifaAnterior) / 1000) * 1000 };
      const created = await tx.oferta.create({
        data: {
          solicitudId: solicitud.id,
          aseguradoraId: aseguradoraIds.get(oferta.aseguradoraCodigo)!,
          primaAnual: oferta.primaAnual,
          deducible: oferta.deducible,
          coberturas: toJson(oferta.coberturas),
          puntajeCobertura: oferta.puntajeCobertura,
        },
      });
      ofertas.push({ ...oferta, id: created.id });
    }
    await evento("COTIZACION", `Datos completos y SARLAFT único recibidos. La plataforma cotizó con ${adaptadores.length} aseguradoras y obtuvo ${ofertas.length} ${ofertas.length === 1 ? "oferta" : "ofertas"}.`, AUTOR_PLATAFORMA, 0.05);
    if (ofertas.length === 0) continue;
    const asesorNombre = USUARIOS.filter((u) => u.rol === Rol.ASESOR)[asesorIds.indexOf(asesorId)].nombre;

    const vendida = plan.estado === EstadoSolicitud.ACEPTADA || plan.estado === EstadoSolicitud.EMITIDA;
    const conAsesoria = plan.estado === EstadoSolicitud.ASESORADA
      || ((vendida || plan.estado === EstadoSolicitud.NO_INTERESADA) && random() < 0.6);

    if (conAsesoria) {
      await tx.asesoria.create({
        data: {
          solicitudId: solicitud.id,
          asesorId,
          ofertaRecomendadaId: ofertas[0].id,
          criterio: pick(CRITERIOS),
          creadaEn: addDays(plan.creadaEn, 1),
        },
      });
      await evento("ASESORIA", `Asesoría registrada: recomienda ${ofertas[0].aseguradoraNombre}. El criterio quedó guardado y no se puede modificar.`, asesorNombre, 1);
    }
    if (motivo) await evento("NO_INTERES", `El cliente indicó que no continúa. Motivo: ${NOMBRES_MOTIVO[motivo].toLowerCase()}.`, AUTOR_CLIENTE, 2);

    if (!vendida) continue;

    // Andina gana a propósito más ventas que las demás, para que el control de imparcialidad muestre el aviso.
    const andina = ofertas.find((o) => o.aseguradoraCodigo === "andina");
    const elegida = andina && random() < 0.5 ? andina : pick(ofertas);
    await tx.oferta.update({ where: { id: elegida.id }, data: { elegida: true } });

    const aceptadaEn = addDays(plan.creadaEn, 2);
    await tx.aceptacion.create({
      data: {
        solicitudId: solicitud.id,
        ofertaId: elegida.id,
        codigo: String(between(100_000, 999_999)),
        generadaEn: aceptadaEn,
        confirmadaEn: aceptadaEn,
      },
    });
    await evento("ACEPTACION", `El cliente eligió la oferta de ${elegida.aseguradoraNombre} y confirmó la aceptación con el código de seis dígitos.`, AUTOR_CLIENTE, 2);

    if (plan.poliza) {
      consecutivoPoliza += between(1, 9);
      const poliza = await tx.poliza.create({
        data: {
          solicitudId: solicitud.id,
          ofertaId: elegida.id,
          numero: `${PREFIJO_POLIZA[plan.ramo]}-${plan.poliza.fechaEmision.getFullYear()}-${String(consecutivoPoliza).padStart(6, "0")}`,
          fechaEmision: plan.poliza.fechaEmision,
          fechaVencimiento: plan.poliza.fechaVencimiento,
          estadoRenovacion: plan.poliza.estadoRenovacion,
        },
      });
      await tx.evento.create({
        data: { solicitudId: solicitud.id, tipo: "EMISION", detalle: `Póliza ${poliza.numero} emitida.`, autor: asesorNombre, creadoEn: poliza.fechaEmision },
      });
      if (plan.poliza.estadoRenovacion !== EstadoRenovacion.PENDIENTE) {
        const renovada = plan.poliza.estadoRenovacion === EstadoRenovacion.RENOVADA;
        await tx.evento.create({
          data: { solicitudId: solicitud.id, tipo: "RENOVACION", detalle: `Póliza ${poliza.numero} marcada como ${renovada ? "renovada" : "no renovada"}.`, autor: asesorNombre, creadoEn: addDays(poliza.fechaVencimiento, -8) },
        });
      }
      polizas.push({ id: poliza.id, ramo: plan.ramo, fechaEmision: poliza.fechaEmision, fechaVencimiento: poliza.fechaVencimiento });
    }
  }

  const inicioPeriodo = addDays(today, -175);
  let siniestros = 0;
  for (let intento = 0; intento < 200 && siniestros < 14; intento += 1) {
    const poliza = pick(polizas);
    const desde = Math.max(poliza.fechaEmision.getTime(), inicioPeriodo.getTime());
    const hasta = Math.min(poliza.fechaVencimiento.getTime(), today.getTime());
    if (hasta - desde < DAY_MS) continue;
    await tx.siniestro.create({
      data: {
        polizaId: poliza.id,
        fechaReporte: new Date(desde + Math.floor(random() * (hasta - desde))),
        descripcion: pick(SINIESTROS[poliza.ramo]),
      },
    });
    siniestros += 1;
  }

  for (let i = 0; i < 16; i += 1) {
    const tipo = pick([TipoPqr.PETICION, TipoPqr.PETICION, TipoPqr.QUEJA, TipoPqr.RECLAMO]);
    const solicitud = pick(solicitudIds);
    await tx.pqr.create({
      data: {
        ramo: solicitud.ramo,
        tipo,
        fecha: addDays(today, -between(1, 175)),
        asunto: pick(ASUNTOS_PQR[tipo]),
        solicitudId: random() < 0.5 ? solicitud.id : null,
      },
    });
  }
}

async function main() {
  if ((await prisma.usuario.count()) > 0) return;

  const claveHashes = await Promise.all(USUARIOS.map((usuario) => bcrypt.hash(usuario.clave, 10)));
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  await prisma.$transaction((tx) => seed(tx, claveHashes, today), { timeout: 120_000, maxWait: 20_000 });
}

main()
  .catch((error) => {
    process.stderr.write(`No se pudieron cargar los datos de ejemplo: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
