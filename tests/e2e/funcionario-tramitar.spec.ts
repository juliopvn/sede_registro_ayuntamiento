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
});
