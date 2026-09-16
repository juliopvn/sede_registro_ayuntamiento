import { test, expect } from "@playwright/test";
import { loginConMagicLink } from "./helpers/auth";
import { EMAIL_ADMINISTRADO, EMAIL_ADMINISTRADO_2 } from "./helpers/fixtures";

test.describe("Control de acceso por rol (verificado en servidor)", () => {
  test("un administrado no puede acceder a páginas de funcionario", async ({ page }) => {
    await loginConMagicLink(page, EMAIL_ADMINISTRADO);

    await page.goto("/funcionario/registros");
    await expect(page).toHaveURL(/\/login/);
  });

  test("un administrado no puede llamar a la API de funcionario aunque fuerce la URL", async ({
    page,
  }) => {
    await loginConMagicLink(page, EMAIL_ADMINISTRADO);

    const respuesta = await page.request.post("/api/expedientes", {
      data: { registroId: "000000000000000000000000" },
    });
    expect(respuesta.status()).toBe(403);

    const respuestaConfig = await page.request.put("/api/config", {
      data: { nombreOrganismo: "Intento no autorizado" },
    });
    expect(respuestaConfig.status()).toBe(403);
  });

  test("un administrado solo ve sus propios registros, aunque haya registros de otros", async ({
    page,
  }) => {
    await loginConMagicLink(page, EMAIL_ADMINISTRADO);

    const respuesta = await page.request.get("/api/registros");
    expect(respuesta.ok()).toBeTruthy();
    const { registros } = (await respuesta.json()) as {
      registros: Array<{ usuarioEmail: string }>;
    };

    expect(registros.length).toBeGreaterThan(0);
    for (const registro of registros) {
      expect(registro.usuarioEmail).toBe(EMAIL_ADMINISTRADO);
    }
  });

  test("un administrado no puede descargar un adjunto de otro administrado", async ({ page }) => {
    // EMAIL_ADMINISTRADO tiene, por el seed, un registro con un adjunto.
    await loginConMagicLink(page, EMAIL_ADMINISTRADO);
    const propios = await page.request.get("/api/registros");
    const { registros: registrosPropios } = (await propios.json()) as {
      registros: Array<{ _id: string; adjuntos: Array<{ key: string }> }>;
    };
    const conAdjunto = registrosPropios.find((r) => r.adjuntos.length > 0);
    expect(conAdjunto, "El seed debe crear al menos un registro con adjunto.").toBeTruthy();

    // Cambiamos de sesión a otro administrado distinto e intentamos descargarlo.
    await loginConMagicLink(page, EMAIL_ADMINISTRADO_2);
    const respuesta = await page.request.get(
      `/api/registros/${conAdjunto!._id}/adjuntos?key=${encodeURIComponent(conAdjunto!.adjuntos[0].key)}`,
    );
    expect(respuesta.status()).toBe(403);
  });

  test("sin sesión, la API de registros exige autenticación", async ({ page }) => {
    const respuesta = await page.request.get("/api/registros");
    expect(respuesta.status()).toBe(401);
  });
});
