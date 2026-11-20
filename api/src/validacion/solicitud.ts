import { z } from "zod";
import { CIUDADES, claves } from "../cotizacion/tarifas.config";
import { RAMOS } from "../cotizacion/tipos";
import { opcion, texto } from "./comunes";

export const TIPOS_DOCUMENTO = ["CC", "CE", "PA", "NIT"] as const;

export const MOTIVOS_NO_INTERES = ["PRECIO", "COBERTURA", "YA_TENGO_SEGURO", "LO_VOY_A_PENSAR", "OTRO"] as const;

// Versión vigente del texto de autorización de tratamiento de datos que se muestra en el paso 1.
export const VERSION_AUTORIZACION = "1.0 (noviembre de 2026)";

// Ramos que piden datos sensibles de salud: exigen una autorización aparte (T01).
export const RAMOS_CON_DATOS_SENSIBLES = ["SALUD", "VIDA"];

export const solicitudSchema = z.object({
  nombre: texto("Falta el nombre del tomador").max(120, "El nombre es demasiado largo"),
  tipoDocumento: opcion([...TIPOS_DOCUMENTO], "Seleccione el tipo de documento"),
  numeroDocumento: texto("Falta el número de documento")
    .regex(/^[0-9A-Za-z-]{5,15}$/, "El número de documento debe tener entre 5 y 15 caracteres, sin puntos"),
  correo: texto("Falta el correo electrónico").email("El correo electrónico no es válido"),
  telefono: texto("Falta el teléfono")
    .transform((valor) => valor.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(3\d{9}|60\d{8})$/, "Escriba un celular de 10 dígitos o un fijo con indicativo, por ejemplo 6015551234")),
  ciudad: opcion(claves(CIUDADES), "Seleccione su ciudad"),
  ramo: opcion([...RAMOS], "Seleccione el ramo"),
  autorizaDatosSensibles: z.boolean().optional(),
  // Ley 1581 de 2012: sin autorización expresa no se pueden tratar los datos personales.
  autorizaDatos: z.literal(true, {
    errorMap: () => ({ message: "Debe autorizar el tratamiento de datos personales para continuar" }),
  }),
}).superRefine((valor, ctx) => {
  // T02: una persona jurídica solo puede cotizar Pymes y RC.
  if (valor.tipoDocumento === "NIT" && valor.ramo !== "PYMES") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ramo"], message: "Con NIT solo se puede cotizar Pymes y RC" });
  }
  if (RAMOS_CON_DATOS_SENSIBLES.includes(valor.ramo) && valor.autorizaDatosSensibles !== true) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["autorizaDatosSensibles"], message: "Este ramo usa datos de salud: debe autorizar su tratamiento" });
  }
});

const fechaPasada = (falta: string) =>
  texto(falta)
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida")
    .transform((v) => new Date(`${v}T12:00:00`))
    .refine((d) => !Number.isNaN(d.getTime()), "La fecha no es válida")
    .refine((d) => d.getTime() <= Date.now() + 12 * 60 * 60 * 1000, "La fecha no puede ser futura");

export const siniestroSchema = z.object({
  fechaEvento: fechaPasada("Indique la fecha del evento"),
  lugar: texto("Indique dónde ocurrió").max(160, "El lugar es demasiado largo"),
  descripcion: texto("Cuente qué ocurrió").min(15, "Describa lo ocurrido con un poco más de detalle").max(1000, "La descripción puede tener hasta 1000 caracteres"),
  documentos: z.array(z.string().max(40)).max(12).default([]),
});

export const pqrSchema = z.object({
  tipo: opcion(["PETICION", "QUEJA", "RECLAMO"], "Seleccione el tipo"),
  descripcion: texto("Escriba su solicitud").min(15, "Escriba su solicitud con un poco más de detalle").max(1000, "Puede tener hasta 1000 caracteres"),
});

export const pagoSchema = z.object({
  formaPago: opcion(["CONTADO", "FINANCIADO", "DEBITO"], "Seleccione la forma de pago"),
});

export const decisionRenovacionSchema = z
  .object({
    decision: opcion(["RENOVAR", "NO_RENOVAR"], "Indique si renueva la póliza"),
    aseguradora: z.string().trim().max(120).optional(),
    motivo: z.enum(["PRECIO", "COBERTURA", "SERVICIO", "YA_NO_LO_NECESITO", "OTRO"]).optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.decision === "RENOVAR" && !valor.aseguradora) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aseguradora"], message: "Seleccione la oferta con la que renueva" });
    if (valor.decision === "NO_RENOVAR" && !valor.motivo) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["motivo"], message: "Seleccione el motivo" });
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
