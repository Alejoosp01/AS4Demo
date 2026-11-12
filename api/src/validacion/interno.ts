import { z } from "zod";
import { texto } from "./comunes";

export const ingresoSchema = z.object({
  correo: texto("Escriba su correo").email("El correo no es válido"),
  clave: z.string({ required_error: "Escriba su contraseña" }).min(1, "Escriba su contraseña"),
});

function fechaLocal(valor: string): Date {
  return new Date(`${valor}T12:00:00`);
}

export const emisionSchema = z.object({
  numero: texto("Escriba el número de póliza")
    .toUpperCase()
    .regex(/^[A-Z0-9-]{4,30}$/, "Use letras, números y guiones, entre 4 y 30 caracteres"),
  fechaVencimiento: texto("Escriba la fecha de vencimiento")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida")
    .refine((v) => !Number.isNaN(fechaLocal(v).getTime()), "La fecha no es válida")
    .refine((v) => fechaLocal(v) > new Date(), "La fecha de vencimiento debe ser posterior a hoy")
    .transform(fechaLocal),
});

export const renovacionSchema = z.object({
  estado: z.enum(["RENOVADA", "NO_RENOVADA"], { errorMap: () => ({ message: "Indique si la póliza se renovó" }) }),
});
