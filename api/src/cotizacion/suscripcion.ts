import { antiguedadVehiculo } from "./riesgo";
import type { Ramo, SolicitudCotizable } from "./tipos";

export type ResultadoSuscripcion = "ESTANDAR" | "CON_CONDICIONES";

export interface Suscripcion {
  resultado: ResultadoSuscripcion;
  /** Qué revisó la aseguradora (T11) y, si aplica, la condición que impone. */
  detalle: string;
}

/** Nombre de la tarea T11 en cada ramo, tal como figura en la matriz del proceso. */
export const REVISION_POR_RAMO: Record<Ramo, string> = {
  AUTOS: "Validación de la inspección del vehículo",
  SALUD: "Evaluación médica",
  VIDA: "Evaluación de asegurabilidad",
  HOGAR: "Inspección de riesgo del inmueble",
  PYMES: "Inspección y suscripción de la empresa",
};

const estandar = (detalle: string): Suscripcion => ({ resultado: "ESTANDAR", detalle });
const condicion = (detalle: string): Suscripcion => ({ resultado: "CON_CONDICIONES", detalle });

/**
 * Suscripción simulada (T11). En la operación real la hace la aseguradora en su sistema y tarda horas o días;
 * aquí se resuelve con reglas fijas para que el mismo riesgo reciba siempre la misma respuesta.
 */
export function evaluarSuscripcion(solicitud: SolicitudCotizable, anioActual = new Date().getFullYear()): Suscripcion {
  switch (solicitud.ramo) {
    case "AUTOS":
      return antiguedadVehiculo(solicitud.datos.modelo, anioActual) > 10
        ? condicion("Inspección aprobada con una garantía: instalar un dispositivo de rastreo satelital antes de 30 días.")
        : estandar("Inspección virtual aprobada sin observaciones.");
    case "SALUD":
      return solicitud.datos.preexistencias
        ? condicion("Aceptación con exclusión de las preexistencias declaradas durante el primer año de vigencia.")
        : estandar("Declaración de salud aceptada en condiciones estándar.");
    case "VIDA":
      return solicitud.datos.edad >= 55
        ? condicion("Aceptación con requisito de examen médico anual para conservar el amparo de enfermedades graves.")
        : estandar("Asegurabilidad aceptada en condiciones estándar.");
    case "HOGAR":
      return solicitud.datos.valorContenidos > 150_000_000
        ? condicion("Inspección aprobada con una garantía: instalar alarma monitoreada antes de 60 días.")
        : estandar("Riesgo aceptado sin inspección adicional.");
    case "PYMES":
      return solicitud.datos.numeroEmpleados > 50
        ? condicion("Suscripción aprobada con garantías: plan de emergencias y extintores con carga vigente.")
        : estandar("Actividad, activos y siniestralidad aceptados en condiciones estándar.");
  }
}
