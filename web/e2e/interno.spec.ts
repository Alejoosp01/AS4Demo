import { expect, test } from "@playwright/test";
import { USUARIOS, ingresar, polizaEmitida, solicitudCotizada } from "./apoyo";

test("sin sesión, la sección del asesor lleva al ingreso", async ({ page }) => {
  await page.goto("/asesor");
  await expect(page).toHaveURL(/\/ingreso\?siguiente=/);
  await page.getByLabel("Correo").fill(USUARIOS.asesor.correo);
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
});

test("la solicitud aparece en la bandeja y la asesoría exige criterio", async ({ page, request }) => {
  const s = await solicitudCotizada(request, "Mauricio Giraldo Arango");
  await ingresar(page, USUARIOS.asesor);
  await expect(page.getByRole("heading", { name: /^Buen(os días|as tardes|as noches), Laura$/ })).toBeVisible();
  await page.getByRole("link", { name: "Solicitudes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Solicitudes", exact: true })).toBeVisible();

  await page.getByLabel("Buscar").fill(s.documento);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${s.documento}`));
  const fila = page.getByRole("row", { name: new RegExp(s.documento) });
  await expect(fila).toBeVisible();
  await expect(fila.getByText("Cotizada")).toBeVisible();
  await expect(fila.getByText("Registrar la asesoría")).toBeVisible();

  await fila.getByRole("link", { name: "Mauricio Giraldo Arango" }).click();
  await expect(page.getByRole("heading", { name: "Mauricio Giraldo Arango" })).toBeVisible();
  await expect(page.getByText(`Solicitud N.º ${s.id}`)).toBeVisible();
  // El panel «Qué sigue» le dice al asesor que le toca registrar la asesoría.
  const sigue = page.getByRole("region", { name: "Registrar la asesoría" });
  await expect(sigue.getByText("Le corresponde a usted")).toBeVisible();
  await expect(sigue.getByText("Falta elegir la oferta que recomienda y escribir el criterio")).toBeVisible();

  await page.getByRole("button", { name: "Guardar asesoría" }).click();
  await expect(page.getByText("Seleccione la oferta que recomienda")).toBeVisible();

  await sigue.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Guardar asesoría" }).click();
  await expect(page.getByText("Escriba el criterio de su recomendación", { exact: true })).toBeVisible();

  await page.getByLabel("Criterio de la recomendación").fill("Mejor cobertura.");
  await page.getByRole("button", { name: "Guardar asesoría" }).click();
  await expect(page.getByText("El criterio debe tener al menos 30 caracteres")).toBeVisible();

  await page.getByLabel("Criterio de la recomendación").fill("Tiene la mayor cobertura del comparativo y la prima está cerca del promedio.");
  await page.getByRole("button", { name: "Guardar asesoría" }).click();
  await expect(page.getByRole("heading", { name: "Asesoría", exact: true })).toBeVisible();
  await expect(page.getByText("Asesorada").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar asesoría" })).toHaveCount(0);
  // Ahora el turno es del cliente, y la bitácora dejó el rastro de la asesoría.
  await expect(page.getByRole("region", { name: "Esperar la decisión del cliente" }).getByText("Le corresponde al cliente")).toBeVisible();
  await expect(page.getByText(/Asesoría registrada: recomienda/)).toBeVisible();
});

test("en la etapa 5 el asesor no digita la póliza: se emite con el pago del cliente", async ({ page, request }) => {
  const s = await solicitudCotizada(request, "Paola Suárez Beltrán");
  const eleccion = await request.post(`/api/solicitudes/${s.token}/eleccion`, { data: { ofertaId: s.ofertas[0].id } });
  const { aceptacion } = await eleccion.json();
  await request.post(`/api/solicitudes/${s.token}/confirmacion`, { data: { codigo: aceptacion.codigo } });

  await ingresar(page, USUARIOS.asesor);
  await page.goto(`/asesor/solicitudes/${s.id}`);
  await expect(page.getByText("Aceptada").first()).toBeVisible();
  const sigue = page.getByRole("region", { name: "Esperar el pago de la prima" });
  await expect(sigue.getByText("Le corresponde al cliente")).toBeVisible();
  await expect(page.getByLabel("Número de póliza")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Suscripción de la aseguradora" })).toBeVisible();

  await request.post(`/api/solicitudes/${s.token}/pago`, { data: { formaPago: "DEBITO" } });
  await page.reload();
  await expect(page.getByText("Emitida").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Póliza", exact: true })).toBeVisible();
  await expect(page.getByText(/expidió la póliza AUT-/)).toBeVisible();
  await expect(page.getByText(/Venta y comisión registradas en el CRM/)).toBeVisible();
});

test("el asesor radica y cierra el siniestro que reportó el cliente", async ({ page, request }) => {
  const s = await polizaEmitida(request, "Felipe Arango Quintero");
  const hoy = new Date();
  const fechaEvento = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const reporte = await request.post(`/api/solicitudes/${s.token}/siniestros`, {
    data: { fechaEvento, lugar: "Medellín", descripcion: "Hurto de espejos en parqueadero público.", documentos: ["fotos", "licencia"] },
  });
  expect(reporte.ok()).toBeTruthy();

  await ingresar(page, USUARIOS.asesor);
  await page.goto(`/asesor/solicitudes/${s.id}`);
  const sigue = page.getByRole("region", { name: "Acompañar al cliente en su caso" });
  await expect(sigue.getByText("Le corresponde a usted")).toBeVisible();
  await sigue.getByRole("button", { name: "Radicar la reclamación" }).click();

  await sigue.getByRole("button", { name: "Cerrar el siniestro" }).click();
  await expect(sigue.getByText("Indique el resultado de la reclamación")).toBeVisible();
  await sigue.getByLabel("Pagado").check();
  await sigue.getByLabel("Valor pagado").fill("850000");
  await sigue.getByRole("button", { name: "Cerrar el siniestro" }).click();

  await expect(page.getByRole("heading", { name: "Sin tareas pendientes" })).toBeVisible();
  await expect(page.getByText(/Cerrado.*pagado por \$ 850\.000/).first()).toBeVisible();
});

test("las renovaciones traen la recotización y el asesor solo registra la decisión del cliente", async ({ page }) => {
  await ingresar(page, USUARIOS.asesor);
  await page.getByRole("link", { name: "Renovaciones", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Renovaciones" })).toBeVisible();
  await expect(page.getByText(/Ver la recotización completa/).first()).toBeVisible();
  await expect(page.getByText("le corresponde llamar").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar la decisión del cliente" }).first()).toBeVisible();
  // Ningún enlace de la aplicación abre otra pestaña.
  expect(await page.locator("a[target]").count()).toBe(0);
});

test("el inicio del asesor ordena las tareas y lleva a la acción", async ({ page }) => {
  await ingresar(page, USUARIOS.asesor);
  await expect(page.getByText(/Tiene \d+ tareas? pendientes?/)).toBeVisible();
  const titulos = await page.locator(".tarea h2").allInnerTexts();
  const orden = ["Acompañar siniestros y PQR", "Registrar asesorías", "Contactar clientes detenidos", "Llamar por renovaciones sin respuesta"];
  const presentes = titulos.map((t) => orden.findIndex((o) => t.startsWith(o)));
  expect(presentes.every((i) => i >= 0)).toBeTruthy();
  expect([...presentes].sort((a, b) => a - b)).toEqual(presentes);

  await page.getByRole("region", { name: /Registrar asesorías/ }).getByRole("link", { name: /^Asesorar:/ }).first().click();
  await expect(page).toHaveURL(/\/asesor\/solicitudes\/\d+#que-sigue$/);
  await expect(page.getByRole("heading", { name: "Registrar la asesoría" })).toBeVisible();
});

test("el asesor ve qué datos le faltan al cliente y el cliente solo completa esos", async ({ page, request }) => {
  const documento = String(Date.now()).slice(-10) + "7";
  const creada = await request.post("/api/solicitudes", {
    data: { nombre: "Yolanda Pineda Castro", tipoDocumento: "CC", numeroDocumento: documento, correo: "prueba@correo.example", telefono: "3001112233", ciudad: "medellin", ramo: "AUTOS", autorizaDatos: true },
  });
  const { token } = await creada.json();
  const borrador = await request.put(`/api/solicitudes/${token}/borrador`, {
    data: {
      datosRamo: { placa: "TST123", modelo: 2022, ciudad: "medellin", uso: "particular" },
      sarlaft: { ocupacion: "Empleada", ingresosMensuales: 6_000_000, egresosMensuales: 2_500_000, personaExpuestaPoliticamente: false },
    },
  });
  const vista = await borrador.json();
  expect(vista.pendientes.map((p: { campo: string }) => p.campo)).toEqual(["sarlaft.origenFondos", "sarlaft.declaraOrigenLicito"]);

  await ingresar(page, USUARIOS.asesor);
  await page.goto(`/asesor/solicitudes/${vista.id}`);
  await expect(page.getByRole("heading", { name: "Esperar los datos del cliente" })).toBeVisible();
  await expect(page.getByText("origen de los fondos, declaración de origen lícito")).toBeVisible();
  await expect(page.getByText(/versión 1\.0/).first()).toBeVisible();

  // El cliente vuelve por su enlace: solo ve los dos campos pendientes.
  await page.goto(`/solicitud/${token}`);
  await expect(page.getByText("solo faltan estos 2 campos")).toBeVisible();
  await expect(page.getByLabel("Placa")).toHaveCount(0);
  await page.getByLabel("Origen de los fondos").fill("Salario");
  await page.getByLabel("Declaro que mis recursos provienen de actividades lícitas").check();
  await page.getByRole("button", { name: "Cotizar" }).click();
  await expect(page.getByRole("heading", { name: "Comparativo de ofertas" })).toBeVisible();
});

test("el tablero muestra las seis variables y el motivo de no compra", async ({ page, request }) => {
  await ingresar(page, USUARIOS.gerencia);
  await expect(page.getByRole("heading", { name: "Tablero de gestión" })).toBeVisible();
  for (const titulo of ["Siniestros reportados", "Tasa de renovación", "PQR", "Motivos de no compra", "Productos más cotizados", "Cotizado frente a vendido"]) {
    await expect(page.getByRole("heading", { name: titulo, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Concentración de ventas.")).toBeVisible();

  const celdaOtro = page.getByRole("region", { name: "Motivos de no compra" }).getByRole("row", { name: /^Otro/ }).getByRole("cell").nth(1);
  const antes = Number(await celdaOtro.innerText());

  const s = await solicitudCotizada(request, "Germán Rojas Torres");
  const respuesta = await request.post(`/api/solicitudes/${s.token}/no-interes`, { data: { motivo: "OTRO", detalle: "Lo va a consultar con su familia" } });
  expect(respuesta.ok()).toBeTruthy();

  await page.reload();
  await expect(celdaOtro).toHaveText(String(antes + 1));

  await page.getByRole("link", { name: "Imparcialidad", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Control de imparcialidad" })).toBeVisible();
  await expect(page.getByText("supera el 40 % de las ventas del periodo")).toBeVisible();
});
