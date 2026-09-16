import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie, verifyMagicLinkToken } from "@/lib/auth";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL;

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=token_invalido", appUrl));
  }

  const resultado = await verifyMagicLinkToken(token);

  if (!resultado.ok || !resultado.usuario) {
    return NextResponse.redirect(
      new URL(`/login?error=${resultado.error ?? "token_invalido"}`, appUrl),
    );
  }

  await setSessionCookie(resultado.usuario);

  const destino = resultado.usuario.rol === "funcionario" ? "/funcionario/registros" : "/administrado/instancias";
  return NextResponse.redirect(new URL(destino, appUrl));
}
