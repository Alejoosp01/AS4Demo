import { expect, test } from "@playwright/test";
import { USUARIOS, ingresar, solicitudCotizada } from "./apoyo";

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

test("el asesor emite la póliza de una solicitud aceptada", async ({ page, request }) => {
  const s = await solicitudCotizada(request, "Paola Suárez Beltrán");
  const andina = s.ofertas.find((o) => o.aseguradoraNombre === "Aseguradora Andina") ?? s.ofertas[0];
  const eleccion = await request.post(`/api/solicitudes/${s.token}/eleccion`, { data: { ofertaId: andina.id } });
  const { aceptacion } = await eleccion.json();
  await request.post(`/api/solicitudes/${s.token}/confirmacion`, { data: { codigo: aceptacion.codigo } });

  await ingresar(page, USUARIOS.asesor);
  await page.goto(`/asesor/solicitudes/${s.id}`);
  await expect(page.getByText("Aceptada").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Emitir la póliza" })).toBeVisible();

  const numero = `AUT-E2E-${s.documento.slice(-8)}`;
  await page.getByLabel("Número de póliza").fill(numero);
  await page.getByRole("button", { name: "Marcar como emitida" }).click();
  await expect(page.getByRole("heading", { name: "Póliza", exact: true })).toBeVisible();
  await expect(page.getByText(numero, { exact: true })).toBeVisible();
  await expect(page.getByText("Emitida").first()).toBeVisible();

  await page.getByRole("link", { name: "Renovaciones", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Renovaciones" })).toBeVisible();
  // Las pólizas por vencer ya traen la recotización automática.
  await expect(page.getByText(/Ver la recotización completa/).first()).toBeVisible();
});

test("el inicio del asesor ordena las tareas y lleva a la acción", async ({ page }) => {
  await ingresar(page, USUARIOS.asesor);
  await expect(page.getByText(/Tiene \d+ tareas? pendientes?/)).toBeVisible();
  const titulos = await page.locator(".tarea h2").allInnerTexts();
  const orden = ["Emitir pólizas", "Registrar asesorías", "Contactar clientes detenidos", "Gestionar renovaciones"];
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
    data: { nombre: "Yolanda Pineda Castro", tipoDocumento: "CC", numeroDocumento: documento, correo: "prueba@correo.example", telefono: "3001112233", ramo: "AUTOS", autorizaDatos: true },
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
