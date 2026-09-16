import { expect, type Page } from "@playwright/test";
import { esperarEnlaceMagico, limpiarBandejaMailHog } from "./mailhog";

/**
 * Ejecuta el flujo real de login por magic link: pide el enlace, lo captura
 * desde MailHog (Fase A12, estrategia (a)) y navega a él.
 */
export async function loginConMagicLink(page: Page, email: string): Promise<void> {
  await limpiarBandejaMailHog();

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar enlace de acceso" }).click();
  await expect(page).toHaveURL(/\/login\/revisa-tu-correo/);

  const enlace = await esperarEnlaceMagico(email);
  await page.goto(enlace);
}
