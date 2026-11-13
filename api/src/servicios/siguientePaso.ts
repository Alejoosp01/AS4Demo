export type CodigoPaso =
  | "ESPERAR_DATOS"
  | "CONTACTAR_CLIENTE"
  | "REGISTRAR_ASESORIA"
  | "ESPERAR_DECISION"
  | "ESPERAR_CODIGO"
  | "ESPERAR_CONDICIONES"
  | "ESPERAR_PAGO"
  | "ATENDER_CASO"
  | "ESPERAR_RENOVACION"
  | "LLAMAR_RENOVACION"
  | "NINGUNO";

export type Responsable = "ASESOR" | "CLIENTE" | "NADIE";

export interface SiguientePaso {
  codigo: CodigoPaso;
  responsable: Responsable;
  /** Tarea de la matriz TO-BE a la que corresponde el paso. */
  tarea: string;
  titulo: string;
  descripcion: string;
}

interface Entrada {
  estado: string;
  alertaAsesorEn: Date | null;
  tieneAsesoria: boolean;
  eleccionSinConfirmar: boolean;
  condicionesPendientes?: boolean;
  casosAbiertos?: number;
  renovacionDecidida?: boolean;
  poliza: { fechaVencimiento: Date; estadoRenovacion: string; propuestaRenovacion?: { enviadaEn: Date } | null } | null;
}

export const DIAS_RENOVACION = 30;
// Si el cliente no responde la propuesta de renovación en este plazo, se alerta al asesor para que lo llame (T15).
export const DIAS_SIN_RESPUESTA_RENOVACION = 5;
const DIA_MS = 24 * 60 * 60 * 1000;

export function diasParaVencer(fechaVencimiento: Date, hoy: Date): number {
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);
  return Math.ceil((fechaVencimiento.getTime() - inicio.getTime()) / DIA_MS) - 1;
}

export function renovacionSinRespuesta(enviadaEn: Date, hoy: Date): boolean {
  return hoy.getTime() - enviadaEn.getTime() >= DIAS_SIN_RESPUESTA_RENOVACION * DIA_MS;
}

const paso = (codigo: CodigoPaso, responsable: Responsable, tarea: string, titulo: string, descripcion: string): SiguientePaso =>
  ({ codigo, responsable, tarea, titulo, descripcion });

/**
 * Deduce, a partir del estado de la solicitud, qué sigue en el flujo TO-BE y a quién le corresponde.
 * En ese flujo el asesor solo interviene para asesorar (T09), destrabar datos (T07),
 * acompañar siniestros y PQR (T16) y llamar cuando una renovación no tiene respuesta (T15).
 */
export function siguientePaso(s: Entrada, hoy = new Date()): SiguientePaso {
  switch (s.estado) {
    case "NUEVA":
      return s.alertaAsesorEn
        ? paso("CONTACTAR_CLIENTE", "ASESOR", "T07", "Contactar al cliente", "Lleva más de 48 horas sin completar sus datos. Llámelo, complétenlos juntos en línea y deje registrado el contacto.")
        : paso("ESPERAR_DATOS", "CLIENTE", "T03–T06", "Esperar los datos del cliente", "El cliente está diligenciando el SARLAFT y el formulario del ramo. La plataforma le recuerda a las 24 horas y le avisa a usted a las 48.");
    case "EN_CUMPLIMIENTO":
      return paso("NINGUNO", "NADIE", "T03", "Escalada a cumplimiento", "Hubo coincidencia en la consulta de listas restrictivas. La solicitud no continúa hasta que cumplimiento la revise.");
    case "COTIZADA":
      return paso("REGISTRAR_ASESORIA", "ASESOR", "T09", "Registrar la asesoría", "El comparativo está listo. Explique las diferencias al cliente, elija la oferta que recomienda y escriba el criterio.");
    case "ASESORADA":
      return s.eleccionSinConfirmar
        ? paso("ESPERAR_CODIGO", "CLIENTE", "T10", "Esperar la firma del cliente", "El cliente eligió una oferta y debe firmar con el código de seis dígitos.")
        : paso("ESPERAR_DECISION", "CLIENTE", "T10", "Esperar la decisión del cliente", "La asesoría quedó registrada. El cliente debe aceptar una oferta, pedir ajustes o indicar por qué no continúa.");
    case "ACEPTADA":
      return s.condicionesPendientes
        ? paso("ESPERAR_CONDICIONES", "CLIENTE", "T12", "Esperar que el cliente acepte las condiciones", "La aseguradora aceptó el riesgo con condiciones. El cliente las ve junto a la oferta y decide si las acepta o pasa a otra opción.")
        : paso("ESPERAR_PAGO", "CLIENTE", "T12", "Esperar el pago de la prima", "La aseguradora ya suscribió el riesgo. Cuando el cliente pague, la póliza se emite y se entrega sola.");
    case "EMITIDA": {
      if ((s.casosAbiertos ?? 0) > 0) {
        return paso("ATENDER_CASO", "ASESOR", "T16", "Acompañar al cliente en su caso", "El cliente reportó un siniestro o una PQR. Radíquelo ante la aseguradora y acompáñelo hasta el cierre.");
      }
      const dias = s.poliza ? diasParaVencer(s.poliza.fechaVencimiento, hoy) : null;
      const enVentana = s.poliza && s.poliza.estadoRenovacion === "PENDIENTE" && dias !== null && dias >= 0 && dias <= DIAS_RENOVACION;
      if (enVentana && !s.renovacionDecidida) {
        const enviada = s.poliza?.propuestaRenovacion?.enviadaEn;
        return enviada && renovacionSinRespuesta(enviada, hoy)
          ? paso("LLAMAR_RENOVACION", "ASESOR", "T15", "Llamar por la renovación", `La póliza vence en ${dias} ${dias === 1 ? "día" : "días"} y el cliente no ha respondido la propuesta en cinco días.`)
          : paso("ESPERAR_RENOVACION", "CLIENTE", "T16", "Esperar la decisión de renovación", `La póliza vence en ${dias} ${dias === 1 ? "día" : "días"}. La plataforma ya recotizó y le envió la propuesta al cliente.`);
      }
      return paso("NINGUNO", "NADIE", "T14", "Sin tareas pendientes", "La póliza está emitida, pagada y entregada.");
    }
    case "NO_INTERESADA":
      return paso("NINGUNO", "NADIE", "T10", "Sin tareas pendientes", "El cliente indicó que no continúa. El motivo alimenta el tablero de gerencia.");
    case "CERRADA":
      return paso("NINGUNO", "NADIE", "T06", "Sin tareas pendientes", "La solicitud se cerró con motivo «datos incompletos»: pasaron cinco días hábiles sin que el cliente completara sus datos.");
    default:
      return paso("NINGUNO", "NADIE", "", "Sin tareas pendientes", "");
  }
}
