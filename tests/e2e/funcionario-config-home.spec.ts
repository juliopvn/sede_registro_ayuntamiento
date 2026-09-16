import { test, expect } from "@playwright/test";
import { loginConMagicLink } from "./helpers/auth";
import { EMAIL_FUNCIONARIO } from "./helpers/fixtures";

test("un funcionario edita los textos de la home y se reflejan en la página pública", async ({
  page,
}) => {
  await loginConMagicLink(page, EMAIL_FUNCIONARIO);

  await page.goto("/funcionario/config");

  const nuevoTitulo = `Título de prueba E2E ${Date.now()}`;
  await page.getByLabel("Título del hero", { exact: true }).fill(nuevoTitulo);

  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados. La home ya los refleja.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: nuevoTitulo })).toBeVisible();
});
