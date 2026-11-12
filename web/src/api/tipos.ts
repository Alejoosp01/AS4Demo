export type Ramo = "AUTOS" | "SALUD" | "VIDA" | "HOGAR" | "PYMES";

export type EstadoSolicitud = "NUEVA" | "COTIZADA" | "ASESORADA" | "ACEPTADA" | "NO_INTERESADA" | "EMITIDA";

export interface Opcion {
  codigo: string;
  nombre: string;
}

export interface Catalogos {
  ramos: Opcion[];
  tiposDocumento: Opcion[];
  ciudades: Opcion[];
  usosVehiculo: Opcion[];
  tiposInmueble: Opcion[];
  ocupaciones: Opcion[];
  actividades: Opcion[];
  motivosNoInteres: Opcion[];
}

export interface Cobertura {
  codigo: string;
  nombre: string;
  explicacion: string;
  incluida: boolean;
}

export interface OfertaVista {
  id: number;
  aseguradoraNombre: string;
  primaAnual: number;
  deducible: string;
  coberturas: Cobertura[];
  puntajeCobertura: number;
  elegida: boolean;
}

export interface SolicitudVista {
  id: number;
  token: string;
  ramo: Ramo;
  estado: EstadoSolicitud;
  creadaEn: string;
  tomador: { nombre: string; tipoDocumento: string; numeroDocumento: string; correo: string; telefono: string };
  autorizaDatosEn: string;
  datosRamo: Record<string, unknown> | null;
  sarlaft: Record<string, unknown> | null;
  ofertas: OfertaVista[];
  noInteres: { motivo: string; detalle: string | null } | null;
  aceptacion: { ofertaId: number; codigo: string | null; confirmadaEn: string | null; constancia: string | null } | null;
  asesoria: { asesor: string; ofertaRecomendadaId: number | null; criterio: string; creadaEn: string } | null;
  poliza: { numero: string; fechaEmision: string; fechaVencimiento: string } | null;
  asesor: string | null;
}
