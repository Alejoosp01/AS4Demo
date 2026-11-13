import { z } from "zod";
import { entero, siNo, texto } from "./comunes";

// Formulario único de conocimiento del cliente (SARLAFT); se comparte con todas las aseguradoras.
const campos = z.object({
  ocupacion: texto("Falta la ocupación o actividad económica").max(120, "La ocupación es demasiado larga"),
  ingresosMensuales: entero("Faltan los ingresos mensuales").min(0, "Los ingresos no pueden ser negativos"),
  egresosMensuales: entero("Faltan los egresos mensuales").min(0, "Los egresos no pueden ser negativos"),
  origenFondos: texto("Indique el origen de los fondos").max(200, "El origen de los fondos es demasiado largo"),
  personaExpuestaPoliticamente: siNo("Indique si es persona expuesta políticamente"),
  // Pregunta adicional que se abre cuando responde «sí» a PEP.
  cargoPep: z.string().trim().max(160, "El cargo es demasiado largo").optional(),
  declaraOrigenLicito: z.literal(true, {
    errorMap: () => ({ message: "Debe declarar que sus recursos provienen de actividades lícitas" }),
  }),
});

/** Campos del formulario, para saber cuáles existen sin pasar por las reglas cruzadas. */
export const CAMPOS_SARLAFT = Object.keys(campos.shape);

export const sarlaftSchema = campos.superRefine((valor, ctx) => {
  if (valor.personaExpuestaPoliticamente && !valor.cargoPep) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cargoPep"], message: "Indique el cargo público y la entidad" });
  }
});

export type Sarlaft = z.infer<typeof sarlaftSchema>;
