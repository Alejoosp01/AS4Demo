import { expect, test } from "@playwright/test";

// Recorre las etapas 1 a 6 de la matriz TO-BE como las vive el cliente, sin que el asesor digite nada.
test("un cliente recorre el flujo TO-BE en Autos, de la solicitud al siniestro", async ({ page, request }) => {
  await page.goto("/solicitud");

  // T01: solicitud con autorización de datos.
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("Debe autorizar el tratamiento de datos personales para continuar")).toBeVisible();

  await page.getByLabel("Nombre completo o razón social").fill("Carolina Mejía Rojas");
  await page.getByLabel("Número de documento").fill(String(Date.now()).slice(-9));
  await page.getByLabel("Correo electrónico").fill("carolina@correo.example");
  await page.getByLabel("Celular o teléfono fijo").fill("3105551234");
  await page.getByLabel("Ciudad", { exact: true }).selectOption({ label: "Bogotá" });
  await page.getByLabel("Autos", { exact: true }).check();
  await page.getByLabel("Autorizo el tratamiento de mis datos personales").check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // T03: el SARLAFT único va antes de los datos del ramo.
  await expect(page.getByRole("heading", { name: "Conocimiento del cliente (SARLAFT)" })).toBeVisible();
  const token = page.url().split("/").pop()!;
  await expect(page.getByLabel("Placa")).toHaveCount(0);

  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("Falta la ocupación o actividad económica")).toBeVisible();

  await page.getByLabel("Ocupación o actividad económica").fill("Contadora");
  await page.getByLabel("Ingresos mensuales").fill("6500000");
  await expect(page.getByLabel("Ingresos mensuales")).toHaveValue("6.500.000");
  await page.getByLabel("Egresos mensuales").fill("3200000");
  await page.getByLabel("Origen de los fondos").fill("Salario");
  // Si es PEP se abre la pregunta adicional.
  const pep = page.getByRole("group", { name: "¿Es persona expuesta políticamente (PEP)?" });
  await pep.getByLabel("Sí").check();
  await expect(page.getByLabel("Cargo público y entidad")).toBeVisible();
  await pep.getByLabel("No").check();
  await expect(page.getByLabel("Cargo público y entidad")).toHaveCount(0);
  await page.getByLabel("Declaro que mis recursos provienen de actividades lícitas").check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // T04: datos del ramo, con la ciudad de la solicitud precargada.
  await expect(page.getByRole("heading", { name: "Datos del seguro: Autos" })).toBeVisible();
  await expect(page.getByLabel("Ciudad de circulación")).toHaveValue("bogota");
  await page.getByRole("button", { name: "Cotizar" }).click();
  await expect(page.getByText("Falta la placa del vehículo")).toBeVisible();
  await expect(page.getByLabel("Placa")).toBeFocused();

  await page.getByLabel("Placa").fill("klm482");
  await page.getByLabel("Año del modelo").fill("2012");
  await page.getByLabel("Uso del vehículo").selectOption({ label: "Particular" });
  await page.getByRole("button", { name: "Cotizar" }).click();

  // T08: comparativo homologado, sin comisión en el orden.
  await expect(page.getByRole("heading", { name: "Comparativo de ofertas" })).toBeVisible();
  expect(await page.getByRole("radio").count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByText("Qué cubre cada amparo")).toBeVisible();
  await expect(page.getByText("comisión", { exact: false }).first()).toBeVisible();

  // T10: aceptación y firma con código.
  await page.getByRole("button", { name: "Elegir oferta" }).click();
  await expect(page.getByText("Seleccione una oferta del comparativo")).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Elegir oferta" }).click();

  await expect(page.getByRole("heading", { name: "Aceptación de la oferta" })).toBeVisible();
  const codigo = (await page.getByTestId("codigo-confirmacion").innerText()).trim();
  expect(codigo).toMatch(/^\d{6}$/);
  await page.getByLabel("Código de confirmación").fill(codigo === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Confirmar aceptación" }).click();
  await expect(page.getByText("El código no coincide")).toBeVisible();
  await page.getByLabel("Código de confirmación").fill(codigo);
  await page.getByRole("button", { name: "Confirmar aceptación" }).click();

  // T11 y T12: la aseguradora responde con una condición (vehículo de más de 10 años) y el cliente la acepta y paga.
  await expect(page.getByRole("heading", { name: "Suscripción y pago" })).toBeVisible();
  await expect(page.getByTestId("numero-constancia")).toHaveText(/^AS4-\d{4}-\d{6}$/);
  await expect(page.getByText("dispositivo de rastreo satelital")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar la prima" })).toHaveCount(0);
  await page.getByRole("button", { name: "Acepto la condición" }).click();
  await page.getByLabel("Financiado").check();
  await page.getByRole("button", { name: "Pagar la prima" }).click();

  // T13 y T14: la póliza se emite y se entrega sola.
  await expect(page.getByRole("heading", { name: "Su póliza" })).toBeVisible();
  await expect(page.getByTestId("numero-poliza")).toHaveText(/^AUT-\d{4}-\d{6}$/);

  const solicitud = await (await request.get(`/api/solicitudes/${token}`)).json();
  expect(solicitud.estado).toBe("EMITIDA");
  expect(solicitud.asesor).toBeTruthy();
  expect(solicitud.poliza.formaPago).toBe("FINANCIADO");
  expect(JSON.stringify(solicitud)).not.toContain("comision");

  // T15: reporte de siniestro con la lista de documentos del ramo.
  await page.getByRole("button", { name: "Reportar un siniestro" }).click();
  await page.getByLabel("Lugar").fill("Bogotá, calle 80 con carrera 30");
  await page.getByLabel("¿Qué ocurrió?").fill("Choque simple contra otro vehículo en un semáforo.");
  await page.getByRole("button", { name: "Enviar el reporte" }).click();
  await expect(page.getByText(/Falta adjuntar/)).toBeVisible();
  await page.getByLabel(/Fotos de los daños/).check();
  await page.getByLabel(/Licencia de conducción/).check();
  await page.getByRole("button", { name: "Enviar el reporte" }).click();
  await expect(page.getByRole("heading", { name: "Sus casos" })).toBeVisible();
  await expect(page.getByText("Reportado: su asesor lo va a radicar")).toBeVisible();
});

test("«No me interesa» exige un motivo", async ({ page, request }) => {
  const creada = await request.post("/api/solicitudes", {
    data: {
      nombre: "Jorge Salazar Pineda",
      tipoDocumento: "CC",
      numeroDocumento: "79123456",
      correo: "jorge@correo.example",
      telefono: "3125550000",
      ciudad: "bogota",
      ramo: "VIDA",
      autorizaDatos: true,
      autorizaDatosSensibles: true,
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
