import { z } from "zod";
import { RAMOS } from "../cotizacion/tipos";
import { opcion, texto } from "./comunes";

export const TIPOS_DOCUMENTO = ["CC", "CE", "PA", "NIT"] as const;

export const MOTIVOS_NO_INTERES = ["PRECIO", "COBERTURA", "YA_TENGO_SEGURO", "LO_VOY_A_PENSAR", "OTRO"] as const;

export const solicitudSchema = z.object({
  nombre: texto("Falta el nombre del tomador").max(120, "El nombre es demasiado largo"),
  tipoDocumento: opcion([...TIPOS_DOCUMENTO], "Seleccione el tipo de documento"),
  numeroDocumento: texto("Falta el número de documento")
    .regex(/^[0-9A-Za-z-]{5,15}$/, "El número de documento debe tener entre 5 y 15 caracteres, sin puntos"),
  correo: texto("Falta el correo electrónico").email("El correo electrónico no es válido"),
  telefono: texto("Falta el teléfono")
    .transform((valor) => valor.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(3\d{9}|60\d{8})$/, "Escriba un celular de 10 dígitos o un fijo con indicativo, por ejemplo 6015551234")),
  ramo: opcion([...RAMOS], "Seleccione el ramo"),
  // Ley 1581 de 2012: sin autorización expresa no se pueden tratar los datos personales.
  autorizaDatos: z.literal(true, {
    errorMap: () => ({ message: "Debe autorizar el tratamiento de datos personales para continuar" }),
  }),
});

export const noInteresSchema = z
  .object({
    motivo: opcion([...MOTIVOS_NO_INTERES], "Seleccione el motivo"),
    detalle: z.string().trim().max(300, "El detalle puede tener hasta 300 caracteres").optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.motivo === "OTRO" && !valor.detalle) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["detalle"], message: "Cuéntenos el motivo" });
    }
  });

export type SolicitudEntrada = z.infer<typeof solicitudSchema>;
export type NoInteresEntrada = z.infer<typeof noInteresSchema>;
