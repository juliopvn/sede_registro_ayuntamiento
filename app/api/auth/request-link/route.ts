import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createMagicLinkToken } from "@/lib/auth";
import { getMailer } from "@/lib/mailer";
import { getEnv } from "@/lib/env";

const requestSchema = z.object({
  email: z.string().email("Introduce un email válido."),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Petición inválida." },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const token = await createMagicLinkToken(email);
  const link = `${getEnv().NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

  await getMailer().sendMagicLinkEmail(email, link);

  // Respuesta genérica: no revelamos si el email existe o no en el sistema.
  return NextResponse.json({ ok: true });
}
