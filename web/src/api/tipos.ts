export type Ramo = "AUTOS" | "SALUD" | "VIDA" | "HOGAR" | "PYMES";

export type EstadoSolicitud = "NUEVA" | "COTIZADA" | "ASESORADA" | "ACEPTADA" | "NO_INTERESADA" | "EMITIDA" | "CERRADA" | "EN_CUMPLIMIENTO";

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
  formasPago: Opcion[];
  motivosNoRenovacion: Opcion[];
  tiposPqr: Opcion[];
  documentosSiniestro: Record<Ramo, { codigo: string; nombre: string; obligatorio: boolean }[]>;
}

export interface Suscripcion {
  resultado: "ESTANDAR" | "CON_CONDICIONES";
  revision: string;
  detalle: string;
  suscritaEn: string;
  condicionesAceptadasEn: string | null;
}

export interface SiniestroVista {
  id: number;
  fechaReporte: string;
  fechaEvento: string | null;
  lugar: string | null;
  descripcion: string;
  documentos: string[] | null;
  avisoTardio: boolean;
  estado: "REPORTADO" | "RADICADO" | "CERRADO";
  radicadoEn: string | null;
  cerradoEn: string | null;
  resultado: "PAGADO" | "OBJETADO" | null;
  valorPagado: number | null;
}

export interface PqrVista {
  id: number;
  tipo: "PETICION" | "QUEJA" | "RECLAMO";
  fecha: string;
  asunto: string;
  descripcion: string | null;
  estado: "ABIERTA" | "CERRADA";
  respuesta: string | null;
  cerradaEn: string | null;
}

export interface OfertaRenovacion {
  aseguradoraNombre: string;
  primaAnual: number;
  deducible: string;
  puntajeCobertura: number;
  amparosIncluidos: number;
  amparosTotales: number;
  esActual: boolean;
}

export interface RenovacionVista {
  enviadaEn: string;
  primaActual: number;
  aseguradoraActual: string;
  ofertas: OfertaRenovacion[];
  decision: "RENOVADA" | "NO_RENOVADA" | null;
  aseguradoraElegida: string | null;
  primaElegida: number | null;
  motivoNoRenovacion: string | null;
  decididaEn: string | null;
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
  tomador: { nombre: string; tipoDocumento: string; numeroDocumento: string; correo: string; telefono: string; ciudad: string | null };
  clasificacion: { tipoCliente: "NATURAL" | "JURIDICA"; tramite: "NUEVA" | "RENOVACION" };
  autorizaDatosEn: string;
  autorizaDatosVersion: string;
  borrador: { datosRamo: Record<string, unknown>; sarlaft: Record<string, unknown> } | null;
  pendientes: { campo: string; etiqueta: string }[];
  datosRamo: Record<string, unknown> | null;
  sarlaft: Record<string, unknown> | null;
  ofertas: OfertaVista[];
  noInteres: { motivo: string; detalle: string | null } | null;
  aceptacion: { ofertaId: number; codigo: string | null; confirmadaEn: string | null; constancia: string | null; suscripcion: Suscripcion | null } | null;
  asesoria: { asesor: string; ofertaRecomendadaId: number | null; criterio: string; creadaEn: string } | null;
  poliza: { numero: string; fechaEmision: string; fechaVencimiento: string; formaPago: string | null; pagadaEn: string | null; estadoRenovacion: string } | null;
  siniestros: SiniestroVista[];
  pqrs: PqrVista[];
  renovacion: RenovacionVista | null;
  asesor: string | null;
}

export type CodigoPaso =
  | "ESPERAR_DATOS"
  | "CONTACTAR_CLIENTE"
  | "REGISTRAR_ASESORIA"
  | "ESPERAR_DECISION"
  | "ESPERAR_CODIGO"
  | "ESPERAR_CONDICIONES"
  | "ESPERAR_PAGO"
  | "ATENDER_CASO"
  | "ESPERAR_RENOVACION"
  | "LLAMAR_RENOVACION"
  | "NINGUNO";

export interface SiguientePaso {
  codigo: CodigoPaso;
  responsable: "ASESOR" | "CLIENTE" | "NADIE";
  tarea: string;
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
