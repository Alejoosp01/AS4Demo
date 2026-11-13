import { pedir } from "./http";
import type { CodigoPaso, EstadoSolicitud, Ramo, SiguientePaso, SolicitudInterna } from "./tipos";

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: "ASESOR" | "GERENTE";
}

export interface FilaBandeja {
  id: number;
  creadaEn: string;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  ramo: Ramo;
  estado: EstadoSolicitud;
  asesor: string | null;
  siguientePaso: Pick<SiguientePaso, "codigo" | "responsable" | "titulo">;
}

export interface TareaResumen {
  codigo: CodigoPaso;
  titulo: string;
  porque: string;
  accion: string;
  total: number;
  filtro: string;
  elementos: { solicitudId: number; nombre: string; ramo: Ramo; detalle: string; urgente: boolean }[];
}

export interface Resumen {
  tareas: TareaResumen[];
  totalPendientes: number;
  esperandoCliente: number;
}

export interface OfertaRenovacion {
  aseguradoraNombre: string;
  primaAnual: number;
  deducible: string;
  puntajeCobertura: number;
  amparosIncluidos: number;
  amparosTotales: number;
  esActual: boolean;
}

export interface Bandeja {
  total: number;
  pagina: number;
  paginas: number;
  solicitudes: FilaBandeja[];
}

export interface Renovacion {
  id: number;
  numero: string;
  solicitudId: number;
  tomador: string;
  telefono: string;
  correo: string;
  ramo: Ramo;
  aseguradora: string;
  primaAnual: number;
  fechaVencimiento: string;
  diasRestantes: number;
  asesor: string | null;
  propuesta: { enviadaEn: string; ofertas: OfertaRenovacion[] } | null;
}

export interface Tablero {
  meses: { clave: string; etiqueta: string }[];
  ramo: Ramo | null;
  siniestros: { mes: string; porRamo: Record<Ramo, number>; total: number }[];
  renovacion: { mes: string; vencidas: number; renovadas: number; tasa: number | null }[];
  pqr: { mes: string; PETICION: number; QUEJA: number; RECLAMO: number; total: number }[];
  motivos: { motivo: string; cantidad: number }[];
  productos: { ramo: Ramo; cotizadas: number }[];
  cotizadoVsVendido: { mes: string; cotizadas: number; vendidas: number; conversion: number | null }[];
  imparcialidad: {
    umbral: number;
    total: number;
    aseguradoras: { aseguradora: string; comisionPct: number; ventas: number; porcentaje: number }[];
    alertas: string[];
  };
}

export const ingresar = (correo: string, clave: string) => pedir<{ usuario: Usuario }>("POST", "/auth/ingreso", { correo, clave });
export const sesionActual = () => pedir<{ usuario: Usuario }>("GET", "/auth/sesion");
export const salir = () => pedir<void>("POST", "/auth/salida");

export const obtenerResumen = () => pedir<Resumen>("GET", "/asesor/resumen");
export const obtenerBandeja = (consulta: string) => pedir<Bandeja>("GET", `/asesor/solicitudes?${consulta}`);
export const obtenerSolicitudInterna = (id: string) => pedir<SolicitudInterna>("GET", `/asesor/solicitudes/${id}`);
export const guardarAsesoria = (id: number, datos: unknown) => pedir<SolicitudInterna>("POST", `/asesor/solicitudes/${id}/asesoria`, datos);
export const emitirPoliza = (id: number, datos: unknown) => pedir<SolicitudInterna>("POST", `/asesor/solicitudes/${id}/emision`, datos);
export const obtenerRenovaciones = () => pedir<Renovacion[]>("GET", "/asesor/renovaciones");
export const marcarRenovacion = (polizaId: number, estado: "RENOVADA" | "NO_RENOVADA") =>
  pedir<void>("POST", `/asesor/polizas/${polizaId}/renovacion`, { estado });

export const obtenerTablero = (meses: string, ramo: string) =>
  pedir<Tablero>("GET", `/gerencia/tablero?meses=${encodeURIComponent(meses)}&ramo=${encodeURIComponent(ramo)}`);
