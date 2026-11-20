import { EstadoRenovacion, EstadoSolicitud, MotivoNoInteres, TipoPqr } from "@prisma/client";
import { prisma } from "../db";
import { RAMOS, type Ramo } from "../cotizacion/tipos";

// Control de imparcialidad: alerta cuando una aseguradora concentra más de este porcentaje de las ventas del periodo.
export const UMBRAL_CONCENTRACION = 40;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const VENDIDAS: EstadoSolicitud[] = [EstadoSolicitud.ACEPTADA, EstadoSolicitud.EMITIDA];

const claveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

function contarPor<T>(items: T[], clave: (item: T) => string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const item of items) mapa.set(clave(item), (mapa.get(clave(item)) ?? 0) + 1);
  return mapa;
}

const ceroPorRamo = () => Object.fromEntries(RAMOS.map((r) => [r, 0])) as Record<Ramo, number>;

export function periodo(meses: number, hoy = new Date()) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1);
  const lista = Array.from({ length: meses }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    return { clave: claveMes(d), etiqueta: `${MESES[d.getMonth()]} ${d.getFullYear()}` };
  });
  return { inicio, lista };
}

export function imparcialidad(
  ventas: { aseguradora: string; comisionPct: number }[],
  aseguradoras: { nombre: string; comisionPct: number }[],
) {
  const total = ventas.length;
  const porAseguradora = contarPor(ventas, (v) => v.aseguradora);
  const filas = aseguradoras
    .map((a) => ({
      aseguradora: a.nombre,
      comisionPct: a.comisionPct,
      ventas: porAseguradora.get(a.nombre) ?? 0,
      porcentaje: porcentaje(porAseguradora.get(a.nombre) ?? 0, total) ?? 0,
    }))
    .sort((a, b) => b.ventas - a.ventas || a.aseguradora.localeCompare(b.aseguradora, "es"));
  return {
    umbral: UMBRAL_CONCENTRACION,
    total,
    aseguradoras: filas,
    alertas: filas.filter((f) => f.porcentaje > UMBRAL_CONCENTRACION).map((f) => f.aseguradora),
  };
}

export async function tablero(meses: number, ramo: Ramo | null, hoy = new Date()) {
  const { inicio, lista } = periodo(meses, hoy);
  const deRamo = ramo ? { ramo } : {};

  const [solicitudes, siniestros, vencidas, pqrs, ventas, aseguradoras] = await Promise.all([
    prisma.solicitud.findMany({
      where: { creadaEn: { gte: inicio, lte: hoy }, ...deRamo },
      select: { ramo: true, estado: true, creadaEn: true, motivoNoInteres: true },
    }),
    prisma.siniestro.findMany({
      where: { fechaReporte: { gte: inicio, lte: hoy }, poliza: { solicitud: deRamo } },
      select: { fechaReporte: true, poliza: { select: { solicitud: { select: { ramo: true } } } } },
    }),
    prisma.poliza.findMany({
      where: { fechaVencimiento: { gte: inicio, lte: hoy }, solicitud: deRamo },
      select: { fechaVencimiento: true, estadoRenovacion: true },
    }),
    prisma.pqr.findMany({ where: { fecha: { gte: inicio, lte: hoy }, ...deRamo }, select: { fecha: true, tipo: true } }),
    prisma.aceptacion.findMany({
      where: { confirmadaEn: { gte: inicio, lte: hoy }, solicitud: deRamo },
      select: { oferta: { select: { aseguradora: { select: { nombre: true, comisionPct: true } } } } },
    }),
    prisma.aseguradora.findMany({ where: { activa: true }, select: { nombre: true, comisionPct: true } }),
  ]);

  const cotizadas = solicitudes.filter((s) => s.estado !== EstadoSolicitud.NUEVA && s.estado !== EstadoSolicitud.CERRADA && s.estado !== EstadoSolicitud.EN_CUMPLIMIENTO);

  return {
    meses: lista,
    ramo,
    siniestros: lista.map(({ clave }) => {
      const porRamo = ceroPorRamo();
      for (const s of siniestros) if (claveMes(s.fechaReporte) === clave) porRamo[s.poliza.solicitud.ramo] += 1;
      return { mes: clave, porRamo, total: Object.values(porRamo).reduce((a, b) => a + b, 0) };
    }),
    renovacion: lista.map(({ clave }) => {
      const delMes = vencidas.filter((p) => claveMes(p.fechaVencimiento) === clave);
      const renovadas = delMes.filter((p) => p.estadoRenovacion === EstadoRenovacion.RENOVADA).length;
      return { mes: clave, vencidas: delMes.length, renovadas, tasa: porcentaje(renovadas, delMes.length) };
    }),
    pqr: lista.map(({ clave }) => {
      const delMes = pqrs.filter((p) => claveMes(p.fecha) === clave);
      const tipos = Object.fromEntries(Object.values(TipoPqr).map((t) => [t, delMes.filter((p) => p.tipo === t).length]));
      return { mes: clave, ...tipos, total: delMes.length };
    }),
    motivos: [
      ...Object.values(MotivoNoInteres).map((motivo) => ({
        motivo: motivo as string,
        cantidad: solicitudes.filter((s) => s.motivoNoInteres === motivo).length,
      })),
      // El cierre automático por datos incompletos (T06) también es una razón de no compra.
      { motivo: "DATOS_INCOMPLETOS", cantidad: solicitudes.filter((s) => s.estado === EstadoSolicitud.CERRADA).length },
    ],
    productos: RAMOS.map((r) => ({ ramo: r, cotizadas: cotizadas.filter((s) => s.ramo === r).length }))
      .filter((p) => !ramo || p.ramo === ramo)
      .sort((a, b) => b.cotizadas - a.cotizadas),
    cotizadoVsVendido: lista.map(({ clave }) => {
      const delMes = cotizadas.filter((s) => claveMes(s.creadaEn) === clave);
      const vendidas = delMes.filter((s) => VENDIDAS.includes(s.estado)).length;
      return { mes: clave, cotizadas: delMes.length, vendidas, conversion: porcentaje(vendidas, delMes.length) };
    }),
    imparcialidad: imparcialidad(
      ventas.map((v) => ({ aseguradora: v.oferta.aseguradora.nombre, comisionPct: v.oferta.aseguradora.comisionPct })),
      aseguradoras,
    ),
  };
}
