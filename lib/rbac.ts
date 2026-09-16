import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { Rol, SessionUsuario } from "@/lib/types";

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Exige una sesión válida. Lanza 401 si no hay usuario autenticado. */
export async function requireSession(): Promise<SessionUsuario> {
  const usuario = await getSession();
  if (!usuario) {
    throw new AuthError(401, "Debes iniciar sesión para continuar.");
  }
  return usuario;
}

/** Exige una sesión válida con un rol concreto. Lanza 403 si el rol no coincide. */
export async function requireRole(rol: Rol): Promise<SessionUsuario> {
  const usuario = await requireSession();
  if (usuario.rol !== rol) {
    throw new AuthError(403, `Esta acción requiere el rol "${rol}".`);
  }
  return usuario;
}

/** Envuelve un handler de API route traduciendo AuthError a respuestas HTTP. */
export function withApiErrorHandling(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return handler().catch((error: unknown) => {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  });
}
