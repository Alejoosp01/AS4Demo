import type { SolicitudCotizable } from "../src/cotizacion/tipos";

type Solicitud<R extends SolicitudCotizable["ramo"]> = Extract<SolicitudCotizable, { ramo: R }>;

export const ANIO = 2026;

export const autos: Solicitud<"AUTOS"> = {
  ramo: "AUTOS",
  datos: { placa: "KLM482", modelo: 2020, ciudad: "bogota", uso: "particular" },
};

export const salud: Solicitud<"SALUD"> = {
  ramo: "SALUD",
  datos: { edades: [42, 39, 10], preexistencias: false },
};

export const vida: Solicitud<"VIDA"> = {
  ramo: "VIDA",
  datos: { edad: 35, ocupacion: "empleado", valorAsegurado: 200_000_000 },
};

export const hogar: Solicitud<"HOGAR"> = {
  ramo: "HOGAR",
  datos: { direccion: "Calle 85 # 15-20, Bogotá", tipoInmueble: "apartamento", valorContenidos: 60_000_000 },
};

export const pymes: Solicitud<"PYMES"> = {
  ramo: "PYMES",
  datos: { nit: "800197268-4", actividad: "comercio", ingresosAnuales: 800_000_000, numeroEmpleados: 12 },
};
