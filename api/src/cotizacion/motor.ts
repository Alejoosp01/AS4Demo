import type { AdaptadorAseguradora } from "./AdaptadorAseguradora";
import { AdaptadorSimulado } from "./AdaptadorSimulado";
import { ordenarOfertas } from "./ordenarOfertas";
import { ASEGURADORAS } from "./tarifas.config";
import type { Oferta, SolicitudCotizable } from "./tipos";

const LIMITE_RESPUESTA_MS = 8000;

export function crearAdaptadoresSimulados(anioActual = new Date().getFullYear()): AdaptadorAseguradora[] {
  return ASEGURADORAS.map((tarifa) => new AdaptadorSimulado(tarifa, anioActual));
}

function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number): Promise<T | null> {
  let temporizador: NodeJS.Timeout | undefined;
  const limite = new Promise<null>((resolve) => {
    temporizador = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

/**
 * Consulta a todas las aseguradoras en paralelo. Una aseguradora que falla o no responde
 * a tiempo queda por fuera del comparativo sin impedir que las demás coticen.
 */
export async function cotizar(
  solicitud: SolicitudCotizable,
  adaptadores: AdaptadorAseguradora[] = crearAdaptadoresSimulados(),
  limiteMs = LIMITE_RESPUESTA_MS,
): Promise<Oferta[]> {
  const respuestas = await Promise.allSettled(
    adaptadores.map((adaptador) => conLimiteDeTiempo(adaptador.cotizar(solicitud), limiteMs)),
  );
  const ofertas = respuestas.flatMap((respuesta) =>
    respuesta.status === "fulfilled" && respuesta.value ? [respuesta.value] : [],
  );
  return ordenarOfertas(ofertas);
}
