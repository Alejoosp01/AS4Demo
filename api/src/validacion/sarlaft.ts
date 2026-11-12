import { z } from "zod";
import { entero, siNo, texto } from "./comunes";

// Formulario único de conocimiento del cliente (SARLAFT); se comparte con todas las aseguradoras.
export const sarlaftSchema = z.object({
  ocupacion: texto("Falta la ocupación o actividad económica").max(120, "La ocupación es demasiado larga"),
  ingresosMensuales: entero("Faltan los ingresos mensuales").min(0, "Los ingresos no pueden ser negativos"),
  egresosMensuales: entero("Faltan los egresos mensuales").min(0, "Los egresos no pueden ser negativos"),
  origenFondos: texto("Indique el origen de los fondos").max(200, "El origen de los fondos es demasiado largo"),
  personaExpuestaPoliticamente: siNo("Indique si es persona expuesta políticamente"),
  declaraOrigenLicito: z.literal(true, {
    errorMap: () => ({ message: "Debe declarar que sus recursos provienen de actividades lícitas" }),
  }),
});

export type Sarlaft = z.infer<typeof sarlaftSchema>;
