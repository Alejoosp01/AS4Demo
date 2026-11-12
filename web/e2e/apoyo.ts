import { type APIRequestContext, type Page, expect } from "@playwright/test";

export const USUARIOS = {
  asesor: { correo: "laura.restrepo@as4.example", clave: "Asesor2026*" },
  gerencia: { correo: "gerencia@as4.example", clave: "Gerencia2026*" },
};

export async function ingresar(page: Page, usuario: { correo: string; clave: string }) {
  await page.goto("/ingreso");
  await page.getByLabel("Correo").fill(usuario.correo);
  await page.getByLabel("Contraseña").fill(usuario.clave);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
}

const SARLAFT = {
  ocupacion: "Empleado",
  ingresosMensuales: 6_000_000,
  egresosMensuales: 2_500_000,
  origenFondos: "Salario",
  personaExpuestaPoliticamente: false,
  declaraOrigenLicito: true,
};

/** Crea por el servicio una solicitud de Autos ya cotizada y devuelve su token, id y documento. */
export async function solicitudCotizada(request: APIRequestContext, nombre: string) {
  const documento = String(Date.now()).slice(-10) + String(Math.floor(Math.random() * 10));
  const creada = await request.post("/api/solicitudes", {
    data: { nombre, tipoDocumento: "CC", numeroDocumento: documento, correo: "prueba@correo.example", telefono: "3001112233", ramo: "AUTOS", autorizaDatos: true },
  });
  expect(creada.ok()).toBeTruthy();
  const { token } = await creada.json();
  const cotizada = await request.put(`/api/solicitudes/${token}/formulario`, {
    data: { datosRamo: { placa: "TST123", modelo: 2022, ciudad: "medellin", uso: "particular" }, sarlaft: SARLAFT },
  });
  expect(cotizada.ok()).toBeTruthy();
  const vista = await cotizada.json();
  return { token, id: vista.id as number, documento, ofertas: vista.ofertas as { id: number; aseguradoraNombre: string }[] };
}
