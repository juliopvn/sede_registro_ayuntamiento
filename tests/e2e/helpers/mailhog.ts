const MAILHOG_API_URL = process.env.MAILHOG_API_URL ?? "http://localhost:8025";

interface MailHogMensaje {
  Content: {
    Headers: Record<string, string[]>;
    Body: string;
  };
}

/** Limpia la bandeja de MailHog para aislar el siguiente test. */
export async function limpiarBandejaMailHog(): Promise<void> {
  await fetch(`${MAILHOG_API_URL}/api/v1/messages`, { method: "DELETE" });
}

function decodificarQuotedPrintable(texto: string): string {
  return texto
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Espera (con reintentos) a que llegue un email a MailHog para el destinatario
 * indicado y devuelve el enlace de acceso (magic link) que contiene.
 */
export async function esperarEnlaceMagico(email: string, intentos = 20): Promise<string> {
  for (let intento = 0; intento < intentos; intento += 1) {
    const response = await fetch(`${MAILHOG_API_URL}/api/v2/messages?limit=50`);
    const data = (await response.json()) as { items: MailHogMensaje[] };

    const mensaje = data.items.find((item) =>
      (item.Content.Headers.To ?? []).some((to) => to.toLowerCase().includes(email.toLowerCase())),
    );

    if (mensaje) {
      const cuerpo = decodificarQuotedPrintable(mensaje.Content.Body);
      const match = cuerpo.match(/href="([^"]*\/api\/auth\/verify\?token=[^"]+)"/);
      if (match) return match[1];
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No ha llegado ningún email a MailHog para ${email} tras ${intentos} intentos.`);
}
