import { describe, expect, it } from "vitest";
import { asesoriaSchema } from "../src/validacion/asesoria";
import { erroresPorCampo } from "../src/validacion/errores";
import { digitoVerificacionNit, nitEsValido } from "../src/validacion/nit";
import { validarDatosRamo } from "../src/validacion/ramos";
import { sarlaftSchema } from "../src/validacion/sarlaft";
import { noInteresSchema, solicitudSchema } from "../src/validacion/solicitud";
import { autos, hogar, pymes, salud, vida } from "./fixtures";

function errores(resultado: { success: true } | { success: false; error: Parameters<typeof erroresPorCampo>[0] }) {
  return resultado.success ? {} : erroresPorCampo(resultado.error);
}

function erroresRamo(...args: Parameters<typeof validarDatosRamo>) {
  const resultado = validarDatosRamo(...args);
  return resultado.ok ? {} : resultado.errores;
}

const solicitudValida = {
  nombre: "Carolina Mejía Rojas",
  tipoDocumento: "CC",
  numeroDocumento: "52123456",
  correo: "carolina@correo.example",
  telefono: "310 555 1234",
  ramo: "AUTOS",
  autorizaDatos: true,
};

const sarlaftValido = {
  ocupacion: "Empleada",
  ingresosMensuales: 6_500_000,
  egresosMensuales: 3_200_000,
  origenFondos: "Salario",
  personaExpuestaPoliticamente: false,
  declaraOrigenLicito: true,
};

describe("solicitud", () => {
  it("acepta una solicitud completa y normaliza el teléfono", () => {
    const resultado = solicitudSchema.parse(solicitudValida);
    expect(resultado.telefono).toBe("3105551234");
  });

  it("exige la autorización de tratamiento de datos", () => {
    expect(errores(solicitudSchema.safeParse({ ...solicitudValida, autorizaDatos: false })).autorizaDatos)
      .toBe("Debe autorizar el tratamiento de datos personales para continuar");
    expect(errores(solicitudSchema.safeParse({ ...solicitudValida, autorizaDatos: undefined })).autorizaDatos)
      .toBeDefined();
  });

  it("devuelve un mensaje por campo", () => {
    const resultado = errores(solicitudSchema.safeParse({ ...solicitudValida, correo: "carolina", telefono: "12345", ramo: "MASCOTAS" }));
    expect(resultado).toEqual({
      correo: "El correo electrónico no es válido",
      telefono: "Escriba un celular de 10 dígitos o un fijo con indicativo, por ejemplo 6015551234",
      ramo: "Seleccione el ramo",
    });
  });

  it("acepta un teléfono fijo con indicativo", () => {
    expect(solicitudSchema.safeParse({ ...solicitudValida, telefono: "601 555 1234" }).success).toBe(true);
  });
});

describe("formulario del ramo", () => {
  it("acepta los datos válidos de cada ramo", () => {
    for (const solicitud of [autos, salud, vida, hogar, pymes]) {
      expect(validarDatosRamo(solicitud.ramo, solicitud.datos).ok).toBe(true);
    }
  });

  it("avisa cuando falta la placa", () => {
    expect(erroresRamo("AUTOS", { ...autos.datos, placa: "" }).placa).toBe("Falta la placa del vehículo");
    expect(erroresRamo("AUTOS", { ...autos.datos, placa: undefined }).placa).toBe("Falta la placa del vehículo");
  });

  it("valida el formato de la placa y la pasa a mayúsculas", () => {
    expect(erroresRamo("AUTOS", { ...autos.datos, placa: "AB1234" }).placa).toMatch(/tres letras y tres números/);
    const resultado = validarDatosRamo("AUTOS", { ...autos.datos, placa: " klm482 " });
    expect(resultado.ok && resultado.valor.ramo === "AUTOS" && resultado.valor.datos.placa).toBe("KLM482");
  });

  it("rechaza ciudades y usos que no están en el catálogo", () => {
    const resultado = erroresRamo("AUTOS", { ...autos.datos, ciudad: "tokio", uso: "carreras" });
    expect(resultado.ciudad).toBe("Seleccione la ciudad de circulación");
    expect(resultado.uso).toBe("Seleccione el uso del vehículo");
  });

  it("valida las edades del grupo de salud", () => {
    expect(erroresRamo("SALUD", { edades: [], preexistencias: false }).edades).toBe("Indique al menos una persona");
    expect(erroresRamo("SALUD", { edades: [40, 95], preexistencias: false })["edades.1"]).toMatch(/hasta los 80 años/);
    expect(erroresRamo("SALUD", { edades: [40] }).preexistencias).toBeDefined();
  });

  it("valida la edad y el valor asegurado de vida", () => {
    const resultado = erroresRamo("VIDA", { ...vida.datos, edad: 16, valorAsegurado: 1_000_000 });
    expect(resultado.edad).toBe("El asegurado debe tener al menos 18 años");
    expect(resultado.valorAsegurado).toBe("El valor asegurado mínimo es $ 10.000.000");
  });

  it("no acepta números con decimales ni texto", () => {
    expect(erroresRamo("VIDA", { ...vida.datos, edad: 35.5 }).edad).toBe("Escriba un número entero, sin decimales");
    expect(erroresRamo("VIDA", { ...vida.datos, edad: "treinta" }).edad).toBe("Falta la edad del asegurado");
  });

  it("valida la dirección del inmueble", () => {
    expect(erroresRamo("HOGAR", { ...hogar.datos, direccion: "  " }).direccion).toBe("Falta la dirección del inmueble");
    expect(erroresRamo("HOGAR", { ...hogar.datos, direccion: "Cra 7" }).direccion).toBe("Escriba la dirección completa");
  });

  it("valida el NIT con el dígito de verificación", () => {
    expect(erroresRamo("PYMES", { ...pymes.datos, nit: "800197268-5" }).nit).toBe("El dígito de verificación del NIT no corresponde");
    expect(erroresRamo("PYMES", { ...pymes.datos, nit: "80019726" }).nit).toMatch(/9 dígitos/);
    expect(erroresRamo("PYMES", { ...pymes.datos, numeroEmpleados: 0 }).numeroEmpleados).toBe("Debe haber al menos un empleado");
  });
});

describe("dígito de verificación del NIT", () => {
  it("calcula el dígito con los pesos de la DIAN", () => {
    expect(digitoVerificacionNit("800197268")).toBe(4);
    expect(digitoVerificacionNit("900123456")).toBe(8);
    expect(nitEsValido("900123456-8")).toBe(true);
    expect(nitEsValido("900123456-7")).toBe(false);
  });
});

describe("SARLAFT", () => {
  it("acepta un formulario completo", () => {
    expect(sarlaftSchema.safeParse(sarlaftValido).success).toBe(true);
  });

  it("exige la declaración de origen lícito y los campos obligatorios", () => {
    const resultado = errores(sarlaftSchema.safeParse({ ...sarlaftValido, declaraOrigenLicito: false, origenFondos: "", personaExpuestaPoliticamente: undefined }));
    expect(resultado.declaraOrigenLicito).toBe("Debe declarar que sus recursos provienen de actividades lícitas");
    expect(resultado.origenFondos).toBe("Indique el origen de los fondos");
    expect(resultado.personaExpuestaPoliticamente).toBe("Indique si es persona expuesta políticamente");
  });
});

describe("asesoría", () => {
  it("no se puede guardar sin criterio", () => {
    expect(errores(asesoriaSchema.safeParse({ ofertaRecomendadaId: 4 })).criterio).toBe("Escriba el criterio de su recomendación");
    expect(errores(asesoriaSchema.safeParse({ ofertaRecomendadaId: 4, criterio: "   " })).criterio).toBe("Escriba el criterio de su recomendación");
  });

  it("exige al menos 30 caracteres sin contar espacios a los lados", () => {
    expect(errores(asesoriaSchema.safeParse({ ofertaRecomendadaId: 4, criterio: `  ${"a".repeat(29)}  ` })).criterio)
      .toBe("El criterio debe tener al menos 30 caracteres");
    expect(asesoriaSchema.safeParse({ ofertaRecomendadaId: 4, criterio: "a".repeat(30) }).success).toBe(true);
  });

  it("exige la oferta recomendada", () => {
    expect(errores(asesoriaSchema.safeParse({ criterio: "a".repeat(40) })).ofertaRecomendadaId).toBe("Seleccione la oferta que recomienda");
  });
});

describe("no me interesa", () => {
  it("exige el motivo", () => {
    expect(errores(noInteresSchema.safeParse({})).motivo).toBe("Seleccione el motivo");
  });

  it("exige el detalle cuando el motivo es otro", () => {
    expect(errores(noInteresSchema.safeParse({ motivo: "OTRO" })).detalle).toBe("Cuéntenos el motivo");
    expect(noInteresSchema.safeParse({ motivo: "OTRO", detalle: "Lo hablo con mi familia" }).success).toBe(true);
    expect(noInteresSchema.safeParse({ motivo: "PRECIO" }).success).toBe(true);
  });
});
