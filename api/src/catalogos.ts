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

export const FORMAS_PAGO = {
  CONTADO: "De contado",
  FINANCIADO: "Financiado",
  DEBITO: "Débito automático",
} as const;

export const MOTIVOS_NO_RENOVACION = {
  PRECIO: "Precio",
  COBERTURA: "Cobertura",
  SERVICIO: "Servicio recibido",
  YA_NO_LO_NECESITO: "Ya no lo necesito",
  OTRO: "Otro",
} as const;

export const TIPOS_PQR = { PETICION: "Petición", QUEJA: "Queja", RECLAMO: "Reclamo" } as const;

export interface DocumentoSiniestro {
  codigo: string;
  nombre: string;
  obligatorio: boolean;
}

/** Lista de documentos que la plataforma le muestra al cliente al reportar un siniestro (T15), según el ramo. */
export const DOCUMENTOS_SINIESTRO: Record<Ramo, DocumentoSiniestro[]> = {
  AUTOS: [
    { codigo: "fotos", nombre: "Fotos de los daños", obligatorio: true },
    { codigo: "licencia", nombre: "Licencia de conducción y tarjeta de propiedad", obligatorio: true },
    { codigo: "croquis", nombre: "Informe de tránsito o croquis", obligatorio: false },
    { codigo: "denuncia", nombre: "Denuncia (si hubo hurto)", obligatorio: false },
  ],
  SALUD: [
    { codigo: "orden", nombre: "Orden médica", obligatorio: true },
    { codigo: "historia", nombre: "Historia clínica o epicrisis", obligatorio: true },
    { codigo: "facturas", nombre: "Facturas (para reembolso)", obligatorio: false },
  ],
  VIDA: [
    { codigo: "historia", nombre: "Historia clínica", obligatorio: true },
    { codigo: "identidad", nombre: "Documento del asegurado y de los beneficiarios", obligatorio: true },
    { codigo: "registro", nombre: "Registro civil de defunción (si aplica)", obligatorio: false },
  ],
  HOGAR: [
    { codigo: "fotos", nombre: "Fotos de los daños", obligatorio: true },
    { codigo: "cotizacion", nombre: "Cotización de la reparación o reposición", obligatorio: true },
    { codigo: "denuncia", nombre: "Denuncia (si hubo hurto)", obligatorio: false },
  ],
  PYMES: [
    { codigo: "informe", nombre: "Informe del evento firmado por el representante legal", obligatorio: true },
    { codigo: "soportes", nombre: "Soportes contables de los bienes afectados", obligatorio: true },
    { codigo: "reclamo", nombre: "Reclamación del tercero (en responsabilidad civil)", obligatorio: false },
  ],
};

// Consulta de listas restrictivas simulada (T03): documentos ficticios que producen coincidencia.
export const LISTA_RESTRICTIVA_SIMULADA = ["1000000001", "900000001"];

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
    formasPago: Object.entries(FORMAS_PAGO).map(([codigo, nombre]) => ({ codigo, nombre })),
    motivosNoRenovacion: Object.entries(MOTIVOS_NO_RENOVACION).map(([codigo, nombre]) => ({ codigo, nombre })),
    tiposPqr: Object.entries(TIPOS_PQR).map(([codigo, nombre]) => ({ codigo, nombre })),
    documentosSiniestro: DOCUMENTOS_SINIESTRO,
  };
}
