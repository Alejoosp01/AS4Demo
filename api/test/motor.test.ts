import { describe, expect, it } from "vitest";
import type { AdaptadorAseguradora } from "../src/cotizacion/AdaptadorAseguradora";
import { cotizar, crearAdaptadoresSimulados } from "../src/cotizacion/motor";
import { ASEGURADORAS, COBERTURAS } from "../src/cotizacion/tarifas.config";
import { RAMOS, type SolicitudCotizable } from "../src/cotizacion/tipos";
import { ANIO, autos, hogar, pymes, salud, vida } from "./fixtures";

const adaptadores = () => crearAdaptadoresSimulados(ANIO);

async function primaDe(solicitud: SolicitudCotizable, codigo: string): Promise<number> {
  const oferta = (await cotizar(solicitud, adaptadores())).find((o) => o.aseguradoraCodigo === codigo);
  if (!oferta) throw new Error(`${codigo} no cotizó`);
  return oferta.primaAnual;
}

async function codigosQueCotizan(solicitud: SolicitudCotizable): Promise<string[]> {
  return (await cotizar(solicitud, adaptadores())).map((o) => o.aseguradoraCodigo);
}

describe("motor de cotización", () => {
  it("devuelve la misma salida para la misma entrada", async () => {
    for (const solicitud of [autos, salud, vida, hogar, pymes]) {
      expect(await cotizar(solicitud, adaptadores())).toEqual(await cotizar(solicitud, adaptadores()));
    }
  });

  it("solo cotizan las aseguradoras que manejan el ramo", async () => {
    const esperadas = ASEGURADORAS.filter((a) => a.ramos.AUTOS).map((a) => a.codigo).sort();
    expect((await codigosQueCotizan(autos)).sort()).toEqual(esperadas);
    expect(esperadas.length).toBeLessThan(ASEGURADORAS.length);
  });

  it("todos los ramos tienen al menos dos aseguradoras y ninguno las tiene todas", () => {
    expect(ASEGURADORAS).toHaveLength(8);
    for (const ramo of RAMOS) {
      const cantidad = ASEGURADORAS.filter((a) => a.ramos[ramo]).length;
      expect(cantidad).toBeGreaterThanOrEqual(2);
      expect(cantidad).toBeLessThan(ASEGURADORAS.length);
    }
  });

  it("las coberturas de la configuración existen en el catálogo del ramo", () => {
    for (const aseguradora of ASEGURADORAS) {
      for (const ramo of RAMOS) {
        const tarifa = aseguradora.ramos[ramo];
        if (!tarifa) continue;
        const codigos = COBERTURAS[ramo].map((c) => c.codigo);
        for (const cobertura of tarifa.coberturas) expect(codigos).toContain(cobertura);
      }
    }
  });

  it("cada oferta lista todas las coberturas del ramo con su explicación", async () => {
    for (const oferta of await cotizar(hogar, adaptadores())) {
      expect(oferta.coberturas).toHaveLength(COBERTURAS.HOGAR.length);
      for (const cobertura of oferta.coberturas) expect(cobertura.explicacion.length).toBeGreaterThan(20);
    }
  });

  it("el puntaje es la suma de los pesos de los amparos incluidos", async () => {
    for (const oferta of await cotizar(vida, adaptadores())) {
      const esperado = COBERTURAS.VIDA
        .filter((c) => oferta.coberturas.find((o) => o.codigo === c.codigo)?.incluida)
        .reduce((total, c) => total + c.peso, 0);
      expect(oferta.puntajeCobertura).toBe(esperado);
    }
  });

  it("las primas son enteras, positivas y en miles de pesos", async () => {
    for (const solicitud of [autos, salud, vida, hogar, pymes]) {
      for (const oferta of await cotizar(solicitud, adaptadores())) {
        expect(oferta.primaAnual).toBeGreaterThan(0);
        expect(oferta.primaAnual % 1000).toBe(0);
      }
    }
  });

  it("la prima sube con el riesgo", async () => {
    expect(await primaDe({ ramo: "AUTOS", datos: { ...autos.datos, uso: "trabajo" } } as SolicitudCotizable, "andina"))
      .toBeGreaterThan(await primaDe(autos, "andina"));

    expect(await primaDe({ ramo: "SALUD", datos: { edades: [58], preexistencias: false } }, "andina"))
      .toBeGreaterThan(await primaDe({ ramo: "SALUD", datos: { edades: [28], preexistencias: false } }, "andina"));

    expect(await primaDe({ ramo: "SALUD", datos: { ...salud.datos, preexistencias: true } } as SolicitudCotizable, "andina"))
      .toBeGreaterThan(await primaDe(salud, "andina"));

    expect(await primaDe({ ramo: "VIDA", datos: { ...vida.datos, valorAsegurado: 400_000_000 } } as SolicitudCotizable, "andina"))
      .toBeGreaterThan(await primaDe(vida, "andina"));
  });

  it("aplica las restricciones de cada aseguradora", async () => {
    expect(await codigosQueCotizan({ ramo: "SALUD", datos: { edades: [40], preexistencias: true } }))
      .not.toContain("cordillera");
    expect(await codigosQueCotizan({ ramo: "AUTOS", datos: { ...autos.datos, modelo: 2005 } } as SolicitudCotizable))
      .not.toContain("valle");
    expect(await codigosQueCotizan({ ramo: "AUTOS", datos: { ...autos.datos, uso: "trabajo" } } as SolicitudCotizable))
      .not.toContain("macarena");
    expect(await codigosQueCotizan({ ramo: "VIDA", datos: { ...vida.datos, ocupacion: "conductor" } } as SolicitudCotizable))
      .not.toContain("altiplano");
  });

  it("una aseguradora que falla o no responde no impide el comparativo", async () => {
    const falla: AdaptadorAseguradora = { codigo: "falla", cotizar: () => Promise.reject(new Error("sin servicio")) };
    const lenta: AdaptadorAseguradora = { codigo: "lenta", cotizar: () => new Promise(() => undefined) };
    const ofertas = await cotizar(autos, [...adaptadores(), falla, lenta], 50);
    expect(ofertas).toHaveLength(ASEGURADORAS.filter((a) => a.ramos.AUTOS).length);
  });
});
