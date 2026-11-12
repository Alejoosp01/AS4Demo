import {
  ACTIVIDADES_PYMES,
  CIUDADES,
  OCUPACIONES,
  TIPOS_INMUEBLE,
  USOS_VEHICULO,
} from "./cotizacion/tarifas.config";
import type { Ramo } from "./cotizacion/tipos";
import { MOTIVOS_NO_INTERES } from "./validacion/solicitud";

export const NOMBRES_RAMO: Record<Ramo, string> = {
  AUTOS: "Autos",
  SALUD: "Salud",
  VIDA: "Vida y accidentes",
  HOGAR: "Hogar y copropiedades",
  PYMES: "Pymes y RC",
};

export const NOMBRES_MOTIVO: Record<(typeof MOTIVOS_NO_INTERES)[number], string> = {
  PRECIO: "Precio",
  COBERTURA: "Cobertura",
  YA_TENGO_SEGURO: "Ya tengo seguro",
  LO_VOY_A_PENSAR: "Lo voy a pensar",
  OTRO: "Otro",
};

const TIPOS_DOCUMENTO = [
  { codigo: "CC", nombre: "Cédula de ciudadanía" },
  { codigo: "CE", nombre: "Cédula de extranjería" },
  { codigo: "PA", nombre: "Pasaporte" },
  { codigo: "NIT", nombre: "NIT" },
];

function lista(catalogo: Record<string, { nombre: string }>) {
  return Object.entries(catalogo).map(([codigo, { nombre }]) => ({ codigo, nombre }));
}

export function catalogos() {
  return {
    ramos: lista(Object.fromEntries(Object.entries(NOMBRES_RAMO).map(([c, nombre]) => [c, { nombre }]))),
    tiposDocumento: TIPOS_DOCUMENTO,
    ciudades: lista(CIUDADES),
    usosVehiculo: lista(USOS_VEHICULO),
    tiposInmueble: lista(TIPOS_INMUEBLE),
    ocupaciones: lista(OCUPACIONES),
    actividades: lista(ACTIVIDADES_PYMES),
    motivosNoInteres: lista(Object.fromEntries(Object.entries(NOMBRES_MOTIVO).map(([c, nombre]) => [c, { nombre }]))),
  };
}
