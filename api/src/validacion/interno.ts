import { z } from "zod";
import { texto } from "./comunes";

export const ingresoSchema = z.object({
  correo: texto("Escriba su correo").email("El correo no es válido"),
  clave: z.string({ required_error: "Escriba su contraseña" }).min(1, "Escriba su contraseña"),
});

export const contactoSchema = z.object({
  nota: texto("Escriba qué se habló con el cliente").min(10, "Escriba un poco más de detalle").max(500, "La nota puede tener hasta 500 caracteres"),
});

export const cierreSiniestroSchema = z
  .object({
    resultado: z.enum(["PAGADO", "OBJETADO"], { errorMap: () => ({ message: "Indique el resultado de la reclamación" }) }),
    valorPagado: z.number({ invalid_type_error: "Escriba el valor pagado" }).int("Escriba un número entero").min(0, "El valor no puede ser negativo").optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.resultado === "PAGADO" && !valor.valorPagado) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valorPagado"], message: "Escriba el valor que pagó la aseguradora" });
  });

export const respuestaPqrSchema = z.object({
  respuesta: texto("Escriba la respuesta").min(15, "Escriba la respuesta con un poco más de detalle").max(1000, "Puede tener hasta 1000 caracteres"),
});
