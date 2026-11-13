import { describe, expect, it } from "vitest";
import { cotizar, crearAdaptadoresSimulados } from "../src/cotizacion/motor";
import { ofertasDeRenovacion, ventanaDeRenovacion } from "../src/servicios/renovaciones";
import { PLAZOS, accionesSeguimiento, diasHabilesEntre } from "../src/servicios/seguimiento";
import { diasParaVencer, siguientePaso } from "../src/servicios/siguientePaso";
import { camposPendientes, limpiarBorrador } from "../src/validacion/pendientes";
import { ANIO, autos } from "./fixtures";

const HORA = 60 * 60 * 1000;
// Lunes 2 de noviembre de 2026, 9:00.
const lunes = new Date(2026, 10, 2, 9, 0, 0);
const despues = (horas: number) => new Date(lunes.getTime() + horas * HORA);
const sinAvisos = { creadaEn: lunes, recordatorioEn: null, alertaAsesorEn: null };

describe("seguimiento de datos pendientes (T06 y T07)", () => {
  it("no avisa antes de las 24 horas", () => {
    expect(accionesSeguimiento(sinAvisos, despues(23))).toEqual([]);
  });

  it("envía el recordatorio al cliente a las 24 horas, una sola vez", () => {
    expect(accionesSeguimiento(sinAvisos, despues(PLAZOS.recordatorioHoras))).toEqual(["RECORDATORIO"]);
    expect(accionesSeguimiento({ ...sinAvisos, recordatorioEn: despues(24) }, despues(30))).toEqual([]);
  });

  it("alerta al asesor a las 48 horas, una sola vez", () => {
    expect(accionesSeguimiento({ ...sinAvisos, recordatorioEn: despues(24) }, despues(PLAZOS.alertaAsesorHoras))).toEqual(["ALERTA_ASESOR"]);
    expect(accionesSeguimiento({ ...sinAvisos, recordatorioEn: despues(24), alertaAsesorEn: despues(48) }, despues(60))).toEqual([]);
  });

  it("si el servicio estuvo detenido, envía los dos avisos atrasados", () => {
    expect(accionesSeguimiento(sinAvisos, despues(50))).toEqual(["RECORDATORIO", "ALERTA_ASESOR"]);
  });

  it("cierra la solicitud a los cinco días hábiles", () => {
    // De lunes a viernes van cuatro días hábiles; el quinto se cumple el lunes siguiente.
    expect(accionesSeguimiento(sinAvisos, new Date(2026, 10, 6, 18, 0))).not.toContain("CIERRE");
    expect(accionesSeguimiento(sinAvisos, new Date(2026, 10, 8, 18, 0))).not.toContain("CIERRE");
    expect(accionesSeguimiento(sinAvisos, new Date(2026, 10, 9, 9, 0))).toEqual(["CIERRE"]);
  });

  it("cuenta días hábiles sin sábados ni domingos", () => {
    expect(diasHabilesEntre(lunes, lunes)).toBe(0);
    expect(diasHabilesEntre(lunes, new Date(2026, 10, 3, 9, 0))).toBe(1);
    // De viernes 9:00 a lunes 9:00 hay un solo día hábil.
    expect(diasHabilesEntre(new Date(2026, 10, 6, 9, 0), new Date(2026, 10, 9, 9, 0))).toBe(1);
  });
});

describe("campos pendientes del formulario (T06)", () => {
  it("sin datos, pide todos los campos del ramo y del SARLAFT", () => {
    const campos = camposPendientes("AUTOS", null).map((p) => p.campo);
    expect(campos).toEqual(expect.arrayContaining(["datosRamo.placa", "datosRamo.modelo", "datosRamo.ciudad", "datosRamo.uso", "sarlaft.declaraOrigenLicito"]));
    expect(campos).toHaveLength(10);
  });

  it("con datos parciales, pide solo lo que falta o no es válido", () => {
    const borrador = {
      datosRamo: { ...autos.datos, placa: "12" },
      sarlaft: { ocupacion: "Docente", ingresosMensuales: 4_000_000, egresosMensuales: 2_000_000, origenFondos: "Salario", personaExpuestaPoliticamente: false },
    };
    expect(camposPendientes("AUTOS", borrador)).toEqual([
      { campo: "datosRamo.placa", etiqueta: "Placa" },
      { campo: "sarlaft.declaraOrigenLicito", etiqueta: "Declaración de origen lícito" },
    ]);
  });

  it("un error en una edad se informa como el campo de edades", () => {
    const campos = camposPendientes("SALUD", { datosRamo: { edades: [30, 95], preexistencias: false } }).map((p) => p.campo);
    expect(campos.filter((c) => c.startsWith("datosRamo"))).toEqual(["datosRamo.edades"]);
  });

  it("el borrador descarta campos desconocidos y valores vacíos", () => {
    const limpio = limpiarBorrador("AUTOS", { datosRamo: { placa: "ABC123", ciudad: "", comision: 50, modelo: Number.NaN }, sarlaft: "x", otro: 1 });
    expect(limpio).toEqual({ datosRamo: { placa: "ABC123" }, sarlaft: {} });
  });
});

describe("siguiente paso de la solicitud", () => {
  const base = { alertaAsesorEn: null, tieneAsesoria: false, eleccionSinConfirmar: false, poliza: null };
  const hoy = new Date(2026, 10, 13, 10, 0);
  const codigo = (s: Partial<Parameters<typeof siguientePaso>[0]> & { estado: string }) => {
    const paso = siguientePaso({ ...base, ...s }, hoy);
    return [paso.codigo, paso.responsable];
  };

  it("indica qué sigue y a quién le corresponde en cada estado", () => {
    expect(codigo({ estado: "NUEVA" })).toEqual(["ESPERAR_DATOS", "CLIENTE"]);
    expect(codigo({ estado: "NUEVA", alertaAsesorEn: hoy })).toEqual(["CONTACTAR_CLIENTE", "ASESOR"]);
    expect(codigo({ estado: "COTIZADA" })).toEqual(["REGISTRAR_ASESORIA", "ASESOR"]);
    expect(codigo({ estado: "ASESORADA", tieneAsesoria: true })).toEqual(["ESPERAR_DECISION", "CLIENTE"]);
    expect(codigo({ estado: "ASESORADA", tieneAsesoria: true, eleccionSinConfirmar: true })).toEqual(["ESPERAR_CODIGO", "CLIENTE"]);
    expect(codigo({ estado: "ACEPTADA" })).toEqual(["EMITIR_POLIZA", "ASESOR"]);
    expect(codigo({ estado: "NO_INTERESADA" })).toEqual(["NINGUNO", "NADIE"]);
    expect(codigo({ estado: "CERRADA" })).toEqual(["NINGUNO", "NADIE"]);
  });

  it("pide gestionar la renovación solo en los 30 días previos al vencimiento", () => {
    const poliza = (dias: number, estadoRenovacion = "PENDIENTE") => ({ fechaVencimiento: new Date(2026, 10, 13 + dias, 12, 0), estadoRenovacion });
    expect(codigo({ estado: "EMITIDA", poliza: poliza(31) })).toEqual(["NINGUNO", "NADIE"]);
    expect(codigo({ estado: "EMITIDA", poliza: poliza(30) })).toEqual(["GESTIONAR_RENOVACION", "ASESOR"]);
    expect(codigo({ estado: "EMITIDA", poliza: poliza(0) })).toEqual(["GESTIONAR_RENOVACION", "ASESOR"]);
    expect(codigo({ estado: "EMITIDA", poliza: poliza(10, "RENOVADA") })).toEqual(["NINGUNO", "NADIE"]);
    expect(diasParaVencer(new Date(2026, 10, 20, 12, 0), hoy)).toBe(7);
  });
});

describe("renovación anticipada (T15)", () => {
  it("la ventana cubre desde hoy hasta 30 días después", () => {
    const { desde, hasta } = ventanaDeRenovacion(new Date(2026, 10, 13, 16, 30));
    expect(desde).toEqual(new Date(2026, 10, 13));
    expect(hasta).toEqual(new Date(2026, 11, 14));
  });

  it("la propuesta conserva el orden del comparativo, marca la aseguradora actual y no lleva comisión", async () => {
    const ofertas = await cotizar(autos, crearAdaptadoresSimulados(ANIO + 1));
    const propuesta = ofertasDeRenovacion(ofertas, ofertas[2].aseguradoraNombre);
    expect(propuesta.map((o) => o.aseguradoraNombre)).toEqual(ofertas.map((o) => o.aseguradoraNombre));
    expect(propuesta.filter((o) => o.esActual)).toHaveLength(1);
    expect(propuesta[2].esActual).toBe(true);
    expect(JSON.stringify(propuesta).toLowerCase()).not.toContain("comision");
  });
});
