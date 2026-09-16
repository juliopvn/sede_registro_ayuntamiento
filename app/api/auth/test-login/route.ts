import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { usuariosCollection } from "@/lib/db";
import { getEnv } from "@/lib/env";

// Endpoint de solo-test: crea sesión directamente sin pasar por el email.
// Fallback explícito de la Fase A12 si la lectura del magic link vía
// la API de MailHog resulta inestable en CI. Deshabilitado fuera de test.
const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (getEnv().NODE_ENV !== "test") {
    return NextResponse.json({ error: "No disponible fuera de entorno de test." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const usuario = await (await usuariosCollection()).findOne({ email: parsed.data.email });
  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado. Ejecuta el seed primero." }, { status: 404 });
  }

  await setSessionCookie({ id: usuario._id.toString(), email: usuario.email, rol: usuario.rol });
  return NextResponse.json({ ok: true, rol: usuario.rol });
}
