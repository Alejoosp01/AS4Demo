export type CodigoPaso =
  | "ESPERAR_DATOS"
  | "CONTACTAR_CLIENTE"
  | "REGISTRAR_ASESORIA"
  | "ESPERAR_DECISION"
  | "ESPERAR_CODIGO"
  | "EMITIR_POLIZA"
  | "GESTIONAR_RENOVACION"
  | "NINGUNO";

export type Responsable = "ASESOR" | "CLIENTE" | "NADIE";

export interface SiguientePaso {
  codigo: CodigoPaso;
  responsable: Responsable;
  titulo: string;
  descripcion: string;
}

interface Entrada {
  estado: string;
  alertaAsesorEn: Date | null;
  tieneAsesoria: boolean;
  eleccionSinConfirmar: boolean;
  poliza: { fechaVencimiento: Date; estadoRenovacion: string } | null;
}

export const DIAS_RENOVACION = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

export function diasParaVencer(fechaVencimiento: Date, hoy: Date): number {
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);
  return Math.ceil((fechaVencimiento.getTime() - inicio.getTime()) / DIA_MS) - 1;
}

const paso = (codigo: CodigoPaso, responsable: Responsable, titulo: string, descripcion: string): SiguientePaso => ({ codigo, responsable, titulo, descripcion });

/**
 * Deduce, a partir del estado de la solicitud, qué sigue y a quién le corresponde.
 * Es la misma regla para la bandeja, el inicio del asesor y el detalle.
 */
export function siguientePaso(s: Entrada, hoy = new Date()): SiguientePaso {
  switch (s.estado) {
    case "NUEVA":
      return s.alertaAsesorEn
        ? paso("CONTACTAR_CLIENTE", "ASESOR", "Contactar al cliente", "Lleva más de 48 horas sin completar sus datos. Llámelo y compártale el enlace: solo verá los campos que le faltan.")
        : paso("ESPERAR_DATOS", "CLIENTE", "Esperar los datos del cliente", "El cliente está diligenciando el formulario. La plataforma le recuerda a las 24 horas y le avisa a usted a las 48.");
    case "COTIZADA":
      return paso("REGISTRAR_ASESORIA", "ASESOR", "Registrar la asesoría", "El comparativo está listo. Revise las ofertas con el cliente, elija la que recomienda y escriba el criterio.");
    case "ASESORADA":
      return s.eleccionSinConfirmar
        ? paso("ESPERAR_CODIGO", "CLIENTE", "Esperar el código de confirmación", "El cliente eligió una oferta y debe escribir el código de seis dígitos para aceptarla.")
        : paso("ESPERAR_DECISION", "CLIENTE", "Esperar la decisión del cliente", "La asesoría quedó registrada. El cliente debe elegir una oferta o indicar por qué no continúa.");
    case "ACEPTADA":
      return paso("EMITIR_POLIZA", "ASESOR", "Emitir la póliza", "El cliente aceptó la oferta. Tramite la expedición con la aseguradora y registre el número y la vigencia.");
    case "EMITIDA": {
      const dias = s.poliza ? diasParaVencer(s.poliza.fechaVencimiento, hoy) : null;
      if (s.poliza && s.poliza.estadoRenovacion === "PENDIENTE" && dias !== null && dias >= 0 && dias <= DIAS_RENOVACION) {
        return paso("GESTIONAR_RENOVACION", "ASESOR", "Gestionar la renovación", `La póliza vence en ${dias} ${dias === 1 ? "día" : "días"}. La plataforma ya recotizó: revise la propuesta con el cliente.`);
      }
      return paso("NINGUNO", "NADIE", "Sin tareas pendientes", "La póliza está emitida y vigente.");
    }
    case "NO_INTERESADA":
      return paso("NINGUNO", "NADIE", "Sin tareas pendientes", "El cliente indicó que no continúa. El motivo alimenta el tablero de gerencia.");
    case "CERRADA":
      return paso("NINGUNO", "NADIE", "Sin tareas pendientes", "La solicitud se cerró porque el cliente no completó sus datos en cinco días hábiles.");
    default:
      return paso("NINGUNO", "NADIE", "Sin tareas pendientes", "");
  }
}
