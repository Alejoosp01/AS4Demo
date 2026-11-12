import {
  ACTIVIDADES_PYMES,
  ANTIGUEDAD_VEHICULO,
  CIUDADES,
  EDAD_SALUD,
  EDAD_VIDA,
  OCUPACIONES,
  RECARGO_PREEXISTENCIAS,
  TIPOS_INMUEBLE,
  UNIDADES,
  USOS_VEHICULO,
} from "./tarifas.config";
import type { SolicitudCotizable } from "./tipos";

function factorPorTramo(tramos: { hasta: number; factor: number }[], valor: number): number {
  const tramo = tramos.find((t) => valor <= t.hasta);
  if (!tramo) throw new Error(`Valor fuera de los tramos de tarifa: ${valor}`);
  return tramo.factor;
}

export function antiguedadVehiculo(modelo: number, anioActual: number): number {
  return Math.max(0, anioActual - modelo);
}

/** Multiplicador que se aplica a la prima base de cada aseguradora. */
export function factorRiesgo(solicitud: SolicitudCotizable, anioActual: number): number {
  switch (solicitud.ramo) {
    case "AUTOS": {
      const { ciudad, uso, modelo } = solicitud.datos;
      return CIUDADES[ciudad].factor
        * USOS_VEHICULO[uso].factor
        * factorPorTramo(ANTIGUEDAD_VEHICULO, antiguedadVehiculo(modelo, anioActual));
    }
    case "SALUD": {
      const { edades, preexistencias } = solicitud.datos;
      const grupo = edades.reduce((total, edad) => total + factorPorTramo(EDAD_SALUD, edad), 0);
      return grupo * (preexistencias ? RECARGO_PREEXISTENCIAS : 1);
    }
    case "VIDA": {
      const { valorAsegurado, edad, ocupacion } = solicitud.datos;
      return (valorAsegurado / UNIDADES.valorAseguradoVida)
        * factorPorTramo(EDAD_VIDA, edad)
        * OCUPACIONES[ocupacion].factor;
    }
    case "HOGAR": {
      const { valorContenidos, tipoInmueble } = solicitud.datos;
      // Una parte de la prima es fija (estructura y asistencias) y otra crece con los contenidos.
      return (0.4 + (0.6 * valorContenidos) / UNIDADES.contenidosHogar) * TIPOS_INMUEBLE[tipoInmueble].factor;
    }
    case "PYMES": {
      const { actividad, numeroEmpleados, ingresosAnuales } = solicitud.datos;
      return ACTIVIDADES_PYMES[actividad].factor
        * (1 + numeroEmpleados / 40)
        * (0.7 + (0.3 * ingresosAnuales) / UNIDADES.ingresosPymes);
    }
  }
}

/** Las primas se cotizan en miles de pesos. */
export function redondearPrima(valor: number): number {
  return Math.round(valor / 1000) * 1000;
}
