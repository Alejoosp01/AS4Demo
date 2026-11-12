import type { Oferta } from "./tipos";

type Ordenable = Pick<Oferta, "puntajeCobertura" | "primaAnual" | "aseguradoraNombre">;

/**
 * Orden del comparativo: mayor puntaje de cobertura primero y, a igual cobertura, menor prima.
 * El nombre de la aseguradora solo desempata para que el orden sea estable.
 * La comisión de la agencia no es un dato de entrada de esta función, así que no puede alterar el orden.
 */
export function ordenarOfertas<T extends Ordenable>(ofertas: readonly T[]): T[] {
  return [...ofertas].sort(
    (a, b) =>
      b.puntajeCobertura - a.puntajeCobertura
      || a.primaAnual - b.primaAnual
      || a.aseguradoraNombre.localeCompare(b.aseguradoraNombre, "es"),
  );
}
