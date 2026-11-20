import type { Ramo } from "../cotizacion/tipos";
import { erroresPorCampo } from "./errores";
import { ESQUEMAS_RAMO } from "./ramos";
import { CAMPOS_SARLAFT, sarlaftSchema } from "./sarlaft";

/** Nombre de cada campo tal como lo lee el asesor en la lista de datos pendientes. */
const ETIQUETAS: Record<string, string> = {
  "datosRamo.placa": "Placa",
  "datosRamo.modelo": "Año del modelo",
  "datosRamo.ciudad": "Ciudad de circulación",
  "datosRamo.uso": "Uso del vehículo",
  "datosRamo.edades": "Edades del grupo",
  "datosRamo.preexistencias": "Preexistencias",
  "datosRamo.edad": "Edad del asegurado",
  "datosRamo.ocupacion": "Ocupación del asegurado",
  "datosRamo.valorAsegurado": "Valor asegurado",
  "datosRamo.direccion": "Dirección del inmueble",
  "datosRamo.tipoInmueble": "Tipo de inmueble",
  "datosRamo.valorContenidos": "Valor de los contenidos",
  "datosRamo.nit": "NIT",
  "datosRamo.actividad": "Actividad económica",
  "datosRamo.ingresosAnuales": "Ingresos anuales",
  "datosRamo.numeroEmpleados": "Número de empleados",
  "sarlaft.ocupacion": "Ocupación (SARLAFT)",
  "sarlaft.ingresosMensuales": "Ingresos mensuales",
  "sarlaft.egresosMensuales": "Egresos mensuales",
  "sarlaft.origenFondos": "Origen de los fondos",
  "sarlaft.personaExpuestaPoliticamente": "Persona expuesta políticamente",
  "sarlaft.cargoPep": "Cargo público y entidad",
  "sarlaft.declaraOrigenLicito": "Declaración de origen lícito",
};

export interface Borrador {
  datosRamo: Record<string, unknown>;
  sarlaft: Record<string, unknown>;
}

export interface CampoPendiente {
  campo: string;
  etiqueta: string;
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

function valorGuardable(valor: unknown): boolean {
  if (typeof valor === "boolean") return true;
  if (typeof valor === "number") return Number.isFinite(valor);
  if (typeof valor === "string") return valor.trim() !== "" && valor.length <= 300;
  if (Array.isArray(valor)) return valor.length > 0 && valor.length <= 8 && valor.every((v) => typeof v === "number" && Number.isFinite(v));
  return false;
}

function soloConocidos(entrada: unknown, campos: string[]): Record<string, unknown> {
  if (!esObjeto(entrada)) return {};
  return Object.fromEntries(campos.filter((c) => valorGuardable(entrada[c])).map((c) => [c, entrada[c]]));
}

/** Conserva únicamente los campos del formulario del ramo y del SARLAFT que traen un valor. */
export function limpiarBorrador(ramo: Ramo, entrada: unknown): Borrador {
  const cuerpo = esObjeto(entrada) ? entrada : {};
  return {
    datosRamo: soloConocidos(cuerpo.datosRamo, Object.keys(ESQUEMAS_RAMO[ramo].shape)),
    sarlaft: soloConocidos(cuerpo.sarlaft, CAMPOS_SARLAFT),
  };
}

/** Campos que faltan o no pasan la validación; es lo único que se le pide de nuevo al cliente (T06). */
export function camposPendientes(ramo: Ramo, borrador: unknown): CampoPendiente[] {
  const { datosRamo, sarlaft } = limpiarBorrador(ramo, borrador);
  const delRamo = ESQUEMAS_RAMO[ramo].safeParse(datosRamo);
  const delSarlaft = sarlaftSchema.safeParse(sarlaft);
  const campos = new Set<string>();
  // Un error en «edades.2» se informa como el campo «edades».
  const raiz = (prefijo: string, clave: string) => `${prefijo}.${clave.split(".")[0]}`;
  if (!delRamo.success) for (const clave of Object.keys(erroresPorCampo(delRamo.error))) campos.add(raiz("datosRamo", clave));
  if (!delSarlaft.success) for (const clave of Object.keys(erroresPorCampo(delSarlaft.error))) campos.add(raiz("sarlaft", clave));
  return [...campos].map((campo) => ({ campo, etiqueta: ETIQUETAS[campo] ?? campo }));
}
