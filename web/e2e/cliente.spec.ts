import { expect, test } from "@playwright/test";

test("un cliente completa los cuatro pasos en Autos", async ({ page, request }) => {
  await page.goto("/solicitud");

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Debe autorizar el tratamiento de datos personales para continuar")).toBeVisible();

  await page.getByLabel("Nombre completo o razón social").fill("Carolina Mejía Rojas");
  await page.getByLabel("Número de documento").fill("52123456");
  await page.getByLabel("Correo electrónico").fill("carolina@correo.example");
  await page.getByLabel("Celular o teléfono fijo").fill("3105551234");
  await page.getByLabel("Autos", { exact: true }).check();
  await page.getByLabel("Autorizo el tratamiento de mis datos personales").check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Datos del seguro: Autos" })).toBeVisible();
  const token = page.url().split("/").pop()!;

  await page.getByRole("button", { name: "Cotizar" }).click();
  await expect(page.getByText("Falta la placa del vehículo")).toBeVisible();
  await expect(page.getByLabel("Placa")).toBeFocused();

  await page.getByLabel("Placa").fill("klm482");
  await page.getByLabel("Año del modelo").fill("2021");
  await page.getByLabel("Ciudad de circulación").selectOption({ label: "Bogotá" });
  await page.getByLabel("Uso del vehículo").selectOption({ label: "Particular" });
  await page.getByLabel("Ocupación o actividad económica").fill("Contadora");
  await page.getByLabel("Ingresos mensuales").fill("6500000");
  await expect(page.getByLabel("Ingresos mensuales")).toHaveValue("6.500.000");
  await page.getByLabel("Egresos mensuales").fill("3200000");
  await page.getByLabel("Origen de los fondos").fill("Salario");
  await page.getByRole("group", { name: "¿Es persona expuesta políticamente (PEP)?" }).getByLabel("No").check();
  await page.getByLabel("Declaro que mis recursos provienen de actividades lícitas").check();
  await page.getByRole("button", { name: "Cotizar" }).click();

  await expect(page.getByRole("heading", { name: "Comparativo de ofertas" })).toBeVisible();
  const ofertas = page.getByRole("radio");
  expect(await ofertas.count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByText("Qué cubre cada amparo")).toBeVisible();
  await expect(page.getByText("comisión", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "Elegir oferta" }).click();
  await expect(page.getByText("Seleccione una oferta del comparativo")).toBeVisible();
  await page.getByLabel(/^Elegir Aseguradora Andina/).check();
  await page.getByRole("button", { name: "Elegir oferta" }).click();

  await expect(page.getByRole("heading", { name: "Aceptación de la oferta" })).toBeVisible();
  const codigo = (await page.getByTestId("codigo-confirmacion").innerText()).trim();
  expect(codigo).toMatch(/^\d{6}$/);

  const otro = codigo === "000000" ? "111111" : "000000";
  await page.getByLabel("Código de confirmación").fill(otro);
  await page.getByRole("button", { name: "Confirmar aceptación" }).click();
  await expect(page.getByText("El código no coincide")).toBeVisible();

  await page.getByLabel("Código de confirmación").fill(codigo);
  await page.getByRole("button", { name: "Confirmar aceptación" }).click();

  await expect(page.getByRole("heading", { name: "Constancia de aceptación" })).toBeVisible();
  await expect(page.getByTestId("numero-constancia")).toHaveText(/^AS4-\d{4}-\d{6}$/);

  const respuesta = await request.get(`/api/solicitudes/${token}`);
  const solicitud = await respuesta.json();
  expect(solicitud.estado).toBe("ACEPTADA");
  expect(solicitud.asesor).toBeTruthy();
  expect(JSON.stringify(solicitud)).not.toContain("comision");
});

test("«No me interesa» exige un motivo", async ({ page, request }) => {
  const creada = await request.post("/api/solicitudes", {
    data: {
      nombre: "Jorge Salazar Pineda",
      tipoDocumento: "CC",
      numeroDocumento: "79123456",
      correo: "jorge@correo.example",
      telefono: "3125550000",
      ramo: "VIDA",
      autorizaDatos: true,
    },
  });
  const { token } = await creada.json();
  await request.put(`/api/solicitudes/${token}/formulario`, {
    data: {
      datosRamo: { edad: 40, ocupacion: "docente", valorAsegurado: 150_000_000 },
      sarlaft: {
        ocupacion: "Docente",
        ingresosMensuales: 5_000_000,
        egresosMensuales: 2_000_000,
        origenFondos: "Salario",
        personaExpuestaPoliticamente: false,
        declaraOrigenLicito: true,
      },
    },
  });

  await page.goto(`/solicitud/${token}`);
  await expect(page.getByRole("heading", { name: "Comparativo de ofertas" })).toBeVisible();
  await page.getByRole("button", { name: "No me interesa" }).click();
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(page.getByText("Seleccione el motivo")).toBeVisible();

  await page.getByLabel("Motivo").selectOption({ label: "Precio" });
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(page.getByRole("heading", { name: "Respuesta registrada" })).toBeVisible();
  await expect(page.getByText("Motivo: precio")).toBeVisible();
});
