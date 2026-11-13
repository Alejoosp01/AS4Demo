import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { iniciarSesion, usuarioDeCookie } from "../src/auth/sesion";
import { cotizar, crearAdaptadoresSimulados } from "../src/cotizacion/motor";
import { type SolicitudCompleta, vistaSolicitud } from "../src/servicios/solicitudes";
import { UMBRAL_CONCENTRACION, imparcialidad, periodo } from "../src/servicios/tablero";
import { erroresPorCampo } from "../src/validacion/errores";
import { ingresoSchema } from "../src/validacion/interno";
import { ANIO, autos } from "./fixtures";

function cookieDeSesion(usuarioId: number): string {
  let valor = "";
  const res = { cookie: (_n: string, v: string) => { valor = v; } } as unknown as Response;
  iniciarSesion({ secure: false } as Request, res, usuarioId);
  return valor;
}

const peticion = (cookie: string) => ({ headers: { cookie: `otra=1; as4_sesion=${encodeURIComponent(cookie)}` } }) as Request;

describe("sesión con cookie firmada", () => {
  it("reconoce la cookie que emitió", () => {
    expect(usuarioDeCookie(peticion(cookieDeSesion(7)))).toBe(7);
  });

  it("rechaza una cookie alterada", () => {
    const [contenido, firma] = cookieDeSesion(7).split(".");
    const falso = Buffer.from(JSON.stringify({ u: 1, v: Date.now() + 1e6 })).toString("base64url");
    expect(usuarioDeCookie(peticion(`${falso}.${firma}`))).toBeNull();
    expect(usuarioDeCookie(peticion(`${contenido}.${firma.slice(0, -2)}xx`))).toBeNull();
    expect(usuarioDeCookie(peticion("basura"))).toBeNull();
    expect(usuarioDeCookie({ headers: {} } as Request)).toBeNull();
  });
});

describe("ingreso", () => {
  it("pide correo y contraseña", () => {
    const r = ingresoSchema.safeParse({});
    expect(r.success ? {} : erroresPorCampo(r.error)).toEqual({ correo: "Escriba su correo", clave: "Escriba su contraseña" });
  });
});

describe("control de imparcialidad", () => {
  const aseguradoras = [{ nombre: "A", comisionPct: 10 }, { nombre: "B", comisionPct: 20 }, { nombre: "C", comisionPct: 15 }];
  const ventas = (lista: string[]) => lista.map((aseguradora) => ({ aseguradora, comisionPct: 0 }));

  it("avisa cuando una aseguradora supera el 40 % de las ventas", () => {
    const r = imparcialidad(ventas(["A", "A", "A", "B", "C"]), aseguradoras);
    expect(r.umbral).toBe(UMBRAL_CONCENTRACION);
    expect(r.aseguradoras[0]).toMatchObject({ aseguradora: "A", ventas: 3, porcentaje: 60 });
    expect(r.alertas).toEqual(["A"]);
  });

  it("no avisa cuando la participación es exactamente 40 %", () => {
    expect(imparcialidad(ventas(["A", "A", "B", "B", "C"]), aseguradoras).alertas).toEqual([]);
  });

  it("incluye las aseguradoras sin ventas", () => {
    const r = imparcialidad(ventas(["A"]), aseguradoras);
    expect(r.aseguradoras.map((a) => a.ventas)).toEqual([1, 0, 0]);
  });

  it("arma los meses del periodo terminando en el mes actual", () => {
    const { lista } = periodo(6, new Date(2026, 10, 12));
    expect(lista.map((m) => m.etiqueta)).toEqual(["jun 2026", "jul 2026", "ago 2026", "sep 2026", "oct 2026", "nov 2026"]);
  });
});

describe("vista de la solicitud", () => {
  async function solicitudCon(comisiones: number[]): Promise<SolicitudCompleta> {
    const ofertas = await cotizar(autos, crearAdaptadoresSimulados(ANIO));
    return {
      id: 1, token: "t", ramo: "AUTOS", estado: "COTIZADA", nombre: "N", tipoDocumento: "CC", numeroDocumento: "1", correo: "c", telefono: "3",
      autorizaDatos: true, autorizaDatosEn: new Date(), datosRamo: autos.datos, sarlaft: null, motivoNoInteres: null, detalleNoInteres: null,
      asesorId: null, creadaEn: new Date(), actualizadaEn: new Date(), aceptacion: null, poliza: null, asesoria: null, asesor: null, pqrs: [], eventos: [], borrador: null,
      ofertas: ofertas.reverse().map((o, i) => ({
        id: i + 1, solicitudId: 1, aseguradoraId: i + 1, primaAnual: o.primaAnual, deducible: o.deducible, coberturas: o.coberturas,
        puntajeCobertura: o.puntajeCobertura, elegida: false,
        aseguradora: { id: i + 1, codigo: o.aseguradoraCodigo, nombre: o.aseguradoraNombre, comisionPct: comisiones[i % comisiones.length], activa: true },
      })),
    } as unknown as SolicitudCompleta;
  }

  it("ordena igual con cualquier comisión y nunca la expone", async () => {
    const base = vistaSolicitud(await solicitudCon([12]));
    const otra = vistaSolicitud(await solicitudCon([40, 1, 25, 3, 60]));
    expect(otra.ofertas.map((o) => o.aseguradoraNombre)).toEqual(base.ofertas.map((o) => o.aseguradoraNombre));
    expect(JSON.stringify(otra).toLowerCase()).not.toContain("comision");
  });
});
