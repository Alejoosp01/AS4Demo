import { pedir } from "./http";
import type { Catalogos, SolicitudVista } from "./tipos";

let catalogosEnCache: Promise<Catalogos> | null = null;

export function obtenerCatalogos(): Promise<Catalogos> {
  catalogosEnCache ??= pedir<Catalogos>("GET", "/catalogos").catch((error) => {
    catalogosEnCache = null;
    throw error;
  });
  return catalogosEnCache;
}

export const crearSolicitud = (datos: unknown) => pedir<{ token: string }>("POST", "/solicitudes", datos);
export const obtenerSolicitud = (token: string) => pedir<SolicitudVista>("GET", `/solicitudes/${token}`);
export const guardarBorrador = (token: string, datos: unknown) => pedir<SolicitudVista>("PUT", `/solicitudes/${token}/borrador`, datos);
export const guardarFormulario = (token: string, datos: unknown) => pedir<SolicitudVista>("PUT", `/solicitudes/${token}/formulario`, datos);
export const elegirOferta = (token: string, ofertaId: number) => pedir<SolicitudVista>("POST", `/solicitudes/${token}/eleccion`, { ofertaId });
export const cancelarEleccion = (token: string) => pedir<SolicitudVista>("DELETE", `/solicitudes/${token}/eleccion`);
export const confirmarAceptacion = (token: string, codigo: string) => pedir<SolicitudVista>("POST", `/solicitudes/${token}/confirmacion`, { codigo });
export const registrarNoInteres = (token: string, datos: unknown) => pedir<SolicitudVista>("POST", `/solicitudes/${token}/no-interes`, datos);

export function nombreDe(opciones: { codigo: string; nombre: string }[], codigo: unknown): string {
  return opciones.find((o) => o.codigo === codigo)?.nombre ?? String(codigo ?? "");
}
