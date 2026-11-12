import { z } from "zod";
import {
  ACTIVIDADES_PYMES,
  CIUDADES,
  OCUPACIONES,
  TIPOS_INMUEBLE,
  USOS_VEHICULO,
  claves,
} from "../cotizacion/tarifas.config";
import type { Ramo } from "../cotizacion/tipos";
import { entero, opcion, pesos, siNo, texto } from "./comunes";
import { type ErroresPorCampo, erroresPorCampo } from "./errores";
import { nitEsValido } from "./nit";

const MODELO_MINIMO = 1990;
const EDAD_MAXIMA_SALUD = 80;
const VIDA_EDAD = { minima: 18, maxima: 70 };
const VIDA_VALOR = { minimo: 10_000_000, maximo: 2_000_000_000 };
const CONTENIDOS = { minimo: 5_000_000, maximo: 1_000_000_000 };

export const datosAutosSchema = z.object({
  placa: texto("Falta la placa del vehículo")
    .toUpperCase()
    .regex(/^[A-Z]{3}\d{3}$/, "La placa debe tener tres letras y tres números, por ejemplo ABC123"),
  modelo: entero("Falta el año del modelo")
    .min(MODELO_MINIMO, `El modelo debe ser de ${MODELO_MINIMO} o posterior`)
    .refine((modelo) => modelo <= new Date().getFullYear() + 1, "El año del modelo no es válido"),
  ciudad: opcion(claves(CIUDADES), "Seleccione la ciudad de circulación"),
  uso: opcion(claves(USOS_VEHICULO), "Seleccione el uso del vehículo"),
});

export const datosSaludSchema = z.object({
  edades: z
    .array(
      entero("Indique la edad de cada persona")
        .min(0, "La edad no puede ser negativa")
        .max(EDAD_MAXIMA_SALUD, `Se aseguran personas hasta los ${EDAD_MAXIMA_SALUD} años`),
      { required_error: "Indique las edades del grupo", invalid_type_error: "Indique las edades del grupo" },
    )
    .min(1, "Indique al menos una persona")
    .max(8, "El grupo puede tener hasta 8 personas"),
  preexistencias: siNo("Indique si alguna persona tiene preexistencias"),
});

export const datosVidaSchema = z.object({
  edad: entero("Falta la edad del asegurado")
    .min(VIDA_EDAD.minima, `El asegurado debe tener al menos ${VIDA_EDAD.minima} años`)
    .max(VIDA_EDAD.maxima, `Se aseguran personas hasta los ${VIDA_EDAD.maxima} años`),
  ocupacion: opcion(claves(OCUPACIONES), "Seleccione la ocupación"),
  valorAsegurado: entero("Falta el valor asegurado")
    .min(VIDA_VALOR.minimo, `El valor asegurado mínimo es ${pesos(VIDA_VALOR.minimo)}`)
    .max(VIDA_VALOR.maximo, `El valor asegurado máximo es ${pesos(VIDA_VALOR.maximo)}`),
});

export const datosHogarSchema = z.object({
  direccion: texto("Falta la dirección del inmueble").min(8, "Escriba la dirección completa"),
  tipoInmueble: opcion(claves(TIPOS_INMUEBLE), "Seleccione el tipo de inmueble"),
  valorContenidos: entero("Falta el valor de los contenidos")
    .min(CONTENIDOS.minimo, `El valor mínimo de contenidos es ${pesos(CONTENIDOS.minimo)}`)
    .max(CONTENIDOS.maximo, `El valor máximo de contenidos es ${pesos(CONTENIDOS.maximo)}`),
});

export const datosPymesSchema = z.object({
  nit: texto("Falta el NIT de la empresa")
    .regex(/^\d{9}-\d$/, "Escriba el NIT con 9 dígitos y el dígito de verificación, por ejemplo 900123456-8")
    .refine(nitEsValido, "El dígito de verificación del NIT no corresponde"),
  actividad: opcion(claves(ACTIVIDADES_PYMES), "Seleccione la actividad económica"),
  ingresosAnuales: entero("Faltan los ingresos anuales").min(1, "Los ingresos deben ser mayores que cero"),
  numeroEmpleados: entero("Falta el número de empleados")
    .min(1, "Debe haber al menos un empleado")
    .max(500, "Para más de 500 empleados la cotización se hace con un asesor"),
});

export const ESQUEMAS_RAMO = {
  AUTOS: datosAutosSchema,
  SALUD: datosSaludSchema,
  VIDA: datosVidaSchema,
  HOGAR: datosHogarSchema,
  PYMES: datosPymesSchema,
} as const satisfies Record<Ramo, z.ZodTypeAny>;

export type DatosAutos = z.infer<typeof datosAutosSchema>;
export type DatosSalud = z.infer<typeof datosSaludSchema>;
export type DatosVida = z.infer<typeof datosVidaSchema>;
export type DatosHogar = z.infer<typeof datosHogarSchema>;
export type DatosPymes = z.infer<typeof datosPymesSchema>;

export type SolicitudCotizable =
  | { ramo: "AUTOS"; datos: DatosAutos }
  | { ramo: "SALUD"; datos: DatosSalud }
  | { ramo: "VIDA"; datos: DatosVida }
  | { ramo: "HOGAR"; datos: DatosHogar }
  | { ramo: "PYMES"; datos: DatosPymes };

export type ResultadoValidacion<T> = { ok: true; valor: T } | { ok: false; errores: ErroresPorCampo };

export function validarDatosRamo(ramo: Ramo, datos: unknown): ResultadoValidacion<SolicitudCotizable> {
  const resultado = ESQUEMAS_RAMO[ramo].safeParse(datos);
  if (!resultado.success) return { ok: false, errores: erroresPorCampo(resultado.error) };
  return { ok: true, valor: { ramo, datos: resultado.data } as SolicitudCotizable };
}
