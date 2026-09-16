import { test, expect } from "@playwright/test";
import { loginConMagicLink } from "./helpers/auth";
import { esperarEnlaceMagico, limpiarBandejaMailHog } from "./helpers/mailhog";
import { EMAIL_ADMINISTRADO, EMAIL_FUNCIONARIO } from "./helpers/fixtures";

test.describe("Autenticación por magic link", () => {
  test("un administrado accede y es redirigido a su área personal", async ({ page }) => {
    await loginConMagicLink(page, EMAIL_ADMINISTRADO);
    await expect(page).toHaveURL(/\/administrado\/instancias/);
    await expect(page.getByText(EMAIL_ADMINISTRADO)).toBeVisible();
  });

  test("un funcionario accede y es redirigido al listado de registros", async ({ page }) => {
    await loginConMagicLink(page, EMAIL_FUNCIONARIO);
    await expect(page).toHaveURL(/\/funcionario\/registros/);
    await expect(page.getByRole("heading", { name: "Registros de entrada" })).toBeVisible();
  });

  test("un enlace de acceso ya usado no puede volver a canjearse", async ({ page }) => {
    await limpiarBandejaMailHog();
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(EMAIL_ADMINISTRADO);
    await page.getByRole("button", { name: "Enviar enlace de acceso" }).click();
    const enlace = await esperarEnlaceMagico(EMAIL_ADMINISTRADO);

    await page.goto(enlace);
    await expect(page).toHaveURL(/\/administrado\/instancias/);

    // Reutilizar el mismo enlace (ya canjeado) debe fallar y redirigir con error.
    await page.goto(enlace);
    await expect(page).toHaveURL(/\/login\?error=token_usado/);
  });

  test("sin sesión, las áreas privadas redirigen a /login", async ({ page }) => {
    await page.goto("/administrado/instancias");
    await expect(page).toHaveURL(/\/login/);
  });
});
