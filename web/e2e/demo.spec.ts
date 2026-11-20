import { expect, test } from "@playwright/test";
import { USUARIOS } from "./apoyo";

test("el centro de la demo muestra el flujo, entra por rol y avisa las renovaciones por vencer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Así funciona AS4 Compara/ })).toBeVisible();

  // El mapa del flujo avanza por las siete etapas.
  await expect(page.getByText("Etapa 1 de 7")).toBeVisible();
  await page.getByRole("button", { name: "Etapa siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Captura y validación" })).toBeVisible();

  // El juego explica la respuesta.
  await page.getByRole("group", { name: "Opciones" }).getByRole("button", { name: "Plataforma" }).click();
  await expect(page.getByText("¡Correcto!")).toBeVisible();

  // El asesor entra con un clic y ve la ventana de pólizas por vencer.
  await page.getByRole("button", { name: /Entrar como asesora/ }).click();
  const aviso = page.getByRole("dialog", { name: /vencen? en los próximos 30 días/ });
  await expect(aviso).toBeVisible();
  await aviso.getByRole("link", { name: /Ir a renovaciones/ }).click();
  await expect(page.getByRole("heading", { name: "Renovaciones" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Renovaciones por vencer/ })).toBeVisible();
});

test("gerencia ve el aviso y la línea de tiempo de vencimientos", async ({ page }) => {
  await page.goto("/ingreso");
  await page.getByLabel("Correo").fill(USUARIOS.gerencia.correo);
  await page.getByLabel("Contraseña").fill(USUARIOS.gerencia.clave);
  await page.getByRole("button", { name: "Ingresar" }).click();
  const aviso = page.getByRole("dialog", { name: /vencen? en los próximos 30 días/ });
  await expect(aviso).toBeVisible();
  await aviso.getByRole("link", { name: /Ver vencimientos/ }).click();
  await expect(page.getByRole("heading", { name: "Vencimientos de la cartera" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Línea de tiempo" })).toBeVisible();
});

test("el cliente con una póliza por vencer ve la ventana emergente de renovación", async ({ page, request }) => {
  const sesion = await request.post("/api/auth/ingreso", { data: USUARIOS.asesor });
  expect(sesion.ok()).toBeTruthy();
  const renovaciones = await (await request.get("/api/asesor/renovaciones")).json();
  const pendiente = renovaciones.find((r: { propuesta: unknown }) => r.propuesta);
  test.skip(!pendiente, "No quedan renovaciones pendientes en los datos");
  await page.goto(`/solicitud/${pendiente.token}`);
  const aviso = page.getByRole("dialog", { name: "Su póliza está por vencer" });
  await expect(aviso).toBeVisible();
  await aviso.getByRole("button", { name: "Ver mi propuesta de renovación" }).click();
  await expect(aviso).toBeHidden();
});

test("el formulario del cliente se llena con datos de ejemplo", async ({ page }) => {
  await page.goto("/solicitud");
  await page.getByRole("button", { name: "Llenar con datos de ejemplo" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Conocimiento del cliente (SARLAFT)" })).toBeVisible();
  await page.getByRole("button", { name: "Llenar con datos de ejemplo" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Datos del seguro/ })).toBeVisible();
  await page.getByRole("button", { name: "Llenar con datos de ejemplo" }).click();
  await page.getByRole("button", { name: "Cotizar" }).click();
  await expect(page.getByRole("heading", { name: "Comparativo de ofertas" })).toBeVisible();
});
