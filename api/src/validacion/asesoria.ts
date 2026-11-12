import { z } from "zod";
import { entero, texto } from "./comunes";

// El asesor debe dejar por escrito por qué recomienda una oferta.
export const CRITERIO_MINIMO = 30;

export const asesoriaSchema = z.object({
  ofertaRecomendadaId: entero("Seleccione la oferta que recomienda").positive("Seleccione la oferta que recomienda"),
  criterio: texto("Escriba el criterio de su recomendación")
    .min(CRITERIO_MINIMO, `El criterio debe tener al menos ${CRITERIO_MINIMO} caracteres`)
    .max(2000, "El criterio puede tener hasta 2000 caracteres"),
});

export type AsesoriaEntrada = z.infer<typeof asesoriaSchema>;
