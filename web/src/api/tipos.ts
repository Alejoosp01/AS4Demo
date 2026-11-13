export type Ramo = "AUTOS" | "SALUD" | "VIDA" | "HOGAR" | "PYMES";

export type EstadoSolicitud = "NUEVA" | "COTIZADA" | "ASESORADA" | "ACEPTADA" | "NO_INTERESADA" | "EMITIDA" | "CERRADA";

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
  autorizaDatosVersion: string;
  borrador: { datosRamo: Record<string, unknown>; sarlaft: Record<string, unknown> } | null;
  pendientes: { campo: string; etiqueta: string }[];
  datosRamo: Record<string, unknown> | null;
  sarlaft: Record<string, unknown> | null;
  ofertas: OfertaVista[];
  noInteres: { motivo: string; detalle: string | null } | null;
  aceptacion: { ofertaId: number; codigo: string | null; confirmadaEn: string | null; constancia: string | null } | null;
  asesoria: { asesor: string; ofertaRecomendadaId: number | null; criterio: string; creadaEn: string } | null;
  poliza: { numero: string; fechaEmision: string; fechaVencimiento: string } | null;
  asesor: string | null;
}

export type CodigoPaso =
  | "ESPERAR_DATOS"
  | "CONTACTAR_CLIENTE"
  | "REGISTRAR_ASESORIA"
  | "ESPERAR_DECISION"
  | "ESPERAR_CODIGO"
  | "EMITIR_POLIZA"
  | "GESTIONAR_RENOVACION"
  | "NINGUNO";

export interface SiguientePaso {
  codigo: CodigoPaso;
  responsable: "ASESOR" | "CLIENTE" | "NADIE";
  titulo: string;
  descripcion: string;
}

export interface EventoBitacora {
  tipo: string;
  detalle: string;
  autor: string;
  creadoEn: string;
}

/** Lo que ve el asesor: la solicitud más el siguiente paso, el seguimiento automático y la bitácora. */
export interface SolicitudInterna extends SolicitudVista {
  siguientePaso: SiguientePaso;
  seguimiento: { recordatorioEn: string | null; alertaAsesorEn: string | null; cerradaEn: string | null };
  polizaId: number | null;
  estadoRenovacion: "PENDIENTE" | "RENOVADA" | "NO_RENOVADA" | null;
  eventos: EventoBitacora[];
}
