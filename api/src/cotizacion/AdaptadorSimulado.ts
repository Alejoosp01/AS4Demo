import type { AdaptadorAseguradora } from "./AdaptadorAseguradora";
import { antiguedadVehiculo, factorRiesgo, redondearPrima } from "./riesgo";
import { COBERTURAS, type Restricciones, type TarifaAseguradora } from "./tarifas.config";
import type { Oferta, SolicitudCotizable } from "./tipos";

/**
 * Cotiza con las reglas de tarifas.config.ts. No usa azar ni la hora:
 * la misma solicitud y el mismo año producen siempre la misma oferta.
 */
export class AdaptadorSimulado implements AdaptadorAseguradora {
  readonly codigo: string;

  constructor(
    private readonly tarifa: TarifaAseguradora,
    private readonly anioActual: number,
  ) {
    this.codigo = tarifa.codigo;
  }

  async cotizar(solicitud: SolicitudCotizable): Promise<Oferta | null> {
    const tarifaRamo = this.tarifa.ramos[solicitud.ramo];
    if (!tarifaRamo) return null;
    if (!this.aceptaRiesgo(solicitud, tarifaRamo.restricciones ?? {})) return null;

    const coberturas = COBERTURAS[solicitud.ramo].map((definicion) => ({
      codigo: definicion.codigo,
      nombre: definicion.nombre,
      explicacion: definicion.explicacion,
      incluida: tarifaRamo.coberturas.includes(definicion.codigo),
    }));
    const puntajeCobertura = COBERTURAS[solicitud.ramo]
      .filter((definicion) => tarifaRamo.coberturas.includes(definicion.codigo))
      .reduce((total, definicion) => total + definicion.peso, 0);

    return {
      aseguradoraCodigo: this.tarifa.codigo,
      aseguradoraNombre: this.tarifa.nombre,
      ramo: solicitud.ramo,
      primaAnual: redondearPrima(tarifaRamo.primaBase * factorRiesgo(solicitud, this.anioActual)),
      deducible: tarifaRamo.deducible,
      coberturas,
      puntajeCobertura,
    };
  }

  private aceptaRiesgo(solicitud: SolicitudCotizable, r: Restricciones): boolean {
    switch (solicitud.ramo) {
      case "AUTOS": {
        const { modelo, uso } = solicitud.datos;
        if (r.antiguedadMaximaVehiculo !== undefined
          && antiguedadVehiculo(modelo, this.anioActual) > r.antiguedadMaximaVehiculo) return false;
        return !r.usosExcluidos?.includes(uso);
      }
      case "SALUD": {
        const { preexistencias, edades } = solicitud.datos;
        if (r.aceptaPreexistencias === false && preexistencias) return false;
        const edadMaxima = r.edadMaxima;
        return edadMaxima === undefined || edades.every((edad) => edad <= edadMaxima);
      }
      case "VIDA": {
        const { edad, ocupacion } = solicitud.datos;
        if (r.edadMaxima !== undefined && edad > r.edadMaxima) return false;
        return !r.ocupacionesExcluidas?.includes(ocupacion);
      }
      case "HOGAR":
        return true;
      case "PYMES": {
        const { numeroEmpleados, actividad } = solicitud.datos;
        if (r.empleadosMaximo !== undefined && numeroEmpleados > r.empleadosMaximo) return false;
        return !r.actividadesExcluidas?.includes(actividad);
      }
    }
  }
}
