import { describe, expect, it } from "vitest";
import { cotizar, crearAdaptadoresSimulados } from "../src/cotizacion/motor";
import { ordenarOfertas } from "../src/cotizacion/ordenarOfertas";
import type { Oferta } from "../src/cotizacion/tipos";
import { ANIO, autos, hogar, pymes, salud, vida } from "./fixtures";

const oferta = (aseguradoraNombre: string, puntajeCobertura: number, primaAnual: number) => ({
  aseguradoraNombre,
  puntajeCobertura,
  primaAnual,
});

const nombres = (ofertas: { aseguradoraNombre: string }[]) => ofertas.map((o) => o.aseguradoraNombre);

function mezclar<T>(items: T[], semilla: number): T[] {
  const copia = [...items];
  let estado = semilla;
  for (let i = copia.length - 1; i > 0; i -= 1) {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    const j = estado % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

describe("orden del comparativo", () => {
  it("pone primero la mejor cobertura", () => {
    const ordenadas = ordenarOfertas([oferta("A", 10, 900_000), oferta("B", 15, 2_000_000), oferta("C", 12, 1_000_000)]);
    expect(nombres(ordenadas)).toEqual(["B", "C", "A"]);
  });

  it("a igual cobertura, pone primero la menor prima", () => {
    const ordenadas = ordenarOfertas([oferta("A", 12, 1_500_000), oferta("B", 12, 1_200_000), oferta("C", 9, 800_000)]);
    expect(nombres(ordenadas)).toEqual(["B", "A", "C"]);
  });

  it("no modifica la lista original", () => {
    const original = [oferta("A", 1, 100), oferta("B", 2, 100)];
    ordenarOfertas(original);
    expect(nombres(original)).toEqual(["A", "B"]);
  });

  it("no depende del orden en que responden las aseguradoras", async () => {
    const ofertas = await cotizar(autos, crearAdaptadoresSimulados(ANIO));
    for (let semilla = 1; semilla <= 20; semilla += 1) {
      expect(nombres(ordenarOfertas(mezclar(ofertas, semilla)))).toEqual(nombres(ofertas));
    }
  });
});

describe("la comisión de la agencia no interviene en el orden", () => {
  const conComisiones = (ofertas: Oferta[], comision: (indice: number, total: number) => number) =>
    ofertas.map((o, i) => ({ ...o, comisionPct: comision(i, ofertas.length) }));

  for (const solicitud of [autos, salud, vida, hogar, pymes]) {
    it(`en ${solicitud.ramo}, el orden es el mismo con cualquier comisión`, async () => {
      const ofertas = await cotizar(solicitud, crearAdaptadoresSimulados(ANIO));
      const base = nombres(ordenarOfertas(conComisiones(ofertas, () => 12)));

      const escenarios = [
        conComisiones(ofertas, (i) => 5 + i * 3),
        conComisiones(ofertas, (i, total) => 5 + (total - i) * 3),
        conComisiones(ofertas, (i, total) => (i === total - 1 ? 45 : 8)),
        conComisiones(ofertas, (i) => (i === 0 ? 0 : 30)),
      ];
      for (const [indice, escenario] of escenarios.entries()) {
        expect(nombres(ordenarOfertas(mezclar(escenario, indice + 1)))).toEqual(base);
      }
    });
  }

  it("subir la comisión de la última aseguradora no la sube en el comparativo", async () => {
    const ofertas = await cotizar(autos, crearAdaptadoresSimulados(ANIO));
    const ultima = ofertas[ofertas.length - 1].aseguradoraNombre;
    const ordenadas = ordenarOfertas(
      ofertas.map((o) => ({ ...o, comisionPct: o.aseguradoraNombre === ultima ? 60 : 5 })),
    );
    expect(ordenadas[ordenadas.length - 1].aseguradoraNombre).toBe(ultima);
  });
});
