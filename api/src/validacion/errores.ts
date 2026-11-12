import type { ZodError } from "zod";

export type ErroresPorCampo = Record<string, string>;

/** Un mensaje por campo (el primero), para mostrarlo junto al campo en el formulario. */
export function erroresPorCampo(error: ZodError): ErroresPorCampo {
  const errores: ErroresPorCampo = {};
  for (const issue of error.issues) {
    const campo = issue.path.join(".") || "formulario";
    errores[campo] ??= issue.message;
  }
  return errores;
}
