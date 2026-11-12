import type { Oferta, SolicitudCotizable } from "./tipos";

/**
 * Contrato que cumple cada aseguradora, sea simulada o real.
 * Devuelve null cuando la aseguradora no cotiza el ramo o rechaza el riesgo.
 */
export interface AdaptadorAseguradora {
  readonly codigo: string;
  cotizar(solicitud: SolicitudCotizable): Promise<Oferta | null>;
}
