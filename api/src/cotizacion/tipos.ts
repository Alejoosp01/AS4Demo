import type { SolicitudCotizable } from "../validacion/ramos";

export const RAMOS = ["AUTOS", "SALUD", "VIDA", "HOGAR", "PYMES"] as const;
export type Ramo = (typeof RAMOS)[number];

export interface CoberturaOferta {
  codigo: string;
  nombre: string;
  explicacion: string;
  incluida: boolean;
}

export interface Oferta {
  aseguradoraCodigo: string;
  aseguradoraNombre: string;
  ramo: Ramo;
  primaAnual: number;
  deducible: string;
  coberturas: CoberturaOferta[];
  puntajeCobertura: number;
}

export type { SolicitudCotizable };
