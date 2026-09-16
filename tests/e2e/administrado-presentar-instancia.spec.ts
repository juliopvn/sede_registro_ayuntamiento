import path from "node:path";
import { test, expect } from "@playwright/test";
import { loginConMagicLink } from "./helpers/auth";
import { EMAIL_ADMINISTRADO_2 } from "./helpers/fixtures";

const FICHERO_ADJUNTO = path.join(__dirname, "fixtures", "documento-prueba.txt");

test("un administrado presenta una instancia con adjunto y la ve en su listado", async ({ page }) => {
  await loginConMagicLink(page, EMAIL_ADMINISTRADO_2);

  await page.goto("/administrado/instancias/nueva");

  const nombreInteresado = `Persona E2E ${Date.now()}`;
  await page.getByLabel("Nombre y apellidos").fill(nombreInteresado);
  await page.getByLabel("NIF / NIE").fill("11111111H");
  await page.getByLabel("Dirección fiscal").fill("Calle E2E 42, 28080 Madrid");
  await page.getByLabel("Expone").fill("Expongo esto como parte de una prueba automatizada.");
  await page.getByLabel("Solicita").fill("Solicito que se registre correctamente.");

  await page.locator('input[type="file"]').setInputFiles(FICHERO_ADJUNTO);
  await expect(page.getByText("Subido")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Presentar instancia" }).click();

  await expect(page).toHaveURL(/\/administrado\/instancias\?presentada=1/);
  await expect(page.getByText("Tu instancia se ha registrado correctamente.")).toBeVisible();

  const filaPresentada = page.locator("li").filter({ hasText: nombreInteresado });
  await expect(filaPresentada).toBeVisible();
  await expect(filaPresentada.getByText("1 adjunto")).toBeVisible();
});
