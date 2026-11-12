import { z } from "zod";

export function texto(falta: string) {
  return z.string({ required_error: falta, invalid_type_error: falta }).trim().min(1, falta);
}

export function entero(falta: string) {
  return z
    .number({ required_error: falta, invalid_type_error: falta })
    .int("Escriba un número entero, sin decimales");
}

export function opcion<T extends [string, ...string[]]>(valores: T, falta: string) {
  return z.enum(valores, { errorMap: () => ({ message: falta }) });
}

export function siNo(falta: string) {
  return z.boolean({ required_error: falta, invalid_type_error: falta });
}

export function pesos(valor: number): string {
  return `$ ${valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}
