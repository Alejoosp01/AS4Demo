import { expect, test } from "@playwright/test";
import { USUARIOS, ingresar, solicitudCotizada } from "./apoyo";

test("sin sesión, la bandeja lleva al ingreso", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "Bandeja de solicitudes" })).toBeVisible();

  await page.getByLabel("Buscar").fill(s.documento);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${s.documento}`));
  const fila = page.getByRole("row", { name: new RegExp(s.documento) });
  await expect(fila).toBeVisible();
  await expect(fila.getByText("Cotizada")).toBeVisible();

  await fila.getByRole("link", { name: "Mauricio Giraldo Arango" }).click();
  await expect(page.getByRole("heading", { name: `Solicitud N.º ${s.id}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comparativo" })).toBeVisible();

  await page.getByLabel("Oferta recomendada").selectOption({ index: 1 });
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

  const numero = `AUT-E2E-${s.documento.slice(-8)}`;
  await page.getByLabel("Número de póliza").fill(numero);
  await page.getByRole("button", { name: "Marcar como emitida" }).click();
  await expect(page.getByRole("heading", { name: "Póliza", exact: true })).toBeVisible();
  await expect(page.getByText(numero)).toBeVisible();
  await expect(page.getByText("Emitida").first()).toBeVisible();

  await page.getByRole("link", { name: "Renovaciones", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Renovaciones" })).toBeVisible();
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
