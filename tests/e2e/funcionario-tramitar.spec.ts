import { test, expect } from "@playwright/test";
import { loginConMagicLink } from "./helpers/auth";
import { EMAIL_FUNCIONARIO } from "./helpers/fixtures";

test("un funcionario ve un registro ajeno, crea un expediente y añade una actuación", async ({
  page,
}) => {
  await loginConMagicLink(page, EMAIL_FUNCIONARIO);
  await expect(page).toHaveURL(/\/funcionario\/registros/);

  // El seed crea registros de administrados que no son el funcionario:
  // comprobamos que puede verlos todos, sin filtrar por propietario.
  const primeraFila = page.locator("ul > li").first();
  await expect(primeraFila).toBeVisible();

  await primeraFila.getByRole("button", { name: "Crear expediente" }).click();

  await expect(page).toHaveURL(/\/funcionario\/expedientes\/[a-f0-9]+/);
  await expect(page.getByRole("heading", { name: /^EXP-\d{4}-\d{6}$/ })).toBeVisible();

  const textoActuacion = `Actuación de prueba E2E ${Date.now()}`;
  await page.getByPlaceholder("Describe la actuación realizada…").fill(textoActuacion);
  await page.getByRole("button", { name: "Añadir actuación" }).click();

  await expect(page.getByText(textoActuacion)).toBeVisible();

  // La actuación inicial (incoación) y la nueva deben estar ambas presentes.
  await expect(page.getByText("Expediente incoado a partir del registro de entrada")).toBeVisible();

  const codigo = await page.getByRole("heading", { name: /^EXP-\d{4}-\d{6}$/ }).textContent();

  // Cerrar el expediente: exige confirmación, deja de admitir actuaciones.
  await page.getByRole("button", { name: "Cerrar expediente" }).click();
  await page.getByRole("button", { name: "Sí, cerrar" }).click();

  await expect(page.getByText("Cerrado", { exact: true })).toBeVisible();
  await expect(page.getByText("Este expediente está cerrado")).toBeVisible();
  await expect(page.getByPlaceholder("Describe la actuación realizada…")).not.toBeVisible();
  await expect(page.getByText(`Expediente cerrado por ${EMAIL_FUNCIONARIO}.`)).toBeVisible();

  // Debe aparecer en la pestaña "Cerrados" y desaparecer de "Abiertos".
  await page.goto("/funcionario/expedientes?estado=cerrado");
  await expect(page.getByText(codigo!)).toBeVisible();

  await page.goto("/funcionario/expedientes");
  await expect(page.getByText(codigo!)).not.toBeVisible();
});
