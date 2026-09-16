import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Lógica de protección de rutas por rol, ejecutada en servidor (edge runtime).
// Next.js solo reconoce el fichero `middleware.ts` como punto de entrada, así
// que ese fichero es un wrapper delgado que delega aquí (ver AGENTS.md).

const SESSION_COOKIE_NAME = "sede_session";

const RUTAS_FUNCIONARIO = ["/funcionario"];
const RUTAS_ADMINISTRADO = ["/administrado"];
// GET /api/config es público (lo lee la home); solo PUT exige rol funcionario.
const API_FUNCIONARIO = ["/api/expedientes"];
const API_SESION_REQUERIDA = ["/api/registros"];

interface SesionEdge {
  sub: string;
  email: string;
  rol: "administrado" | "funcionario";
}

async function leerSesion(request: NextRequest): Promise<SesionEdge | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    const rol = payload.rol === "funcionario" ? "funcionario" : "administrado";
    return { sub: payload.sub, email: payload.email, rol };
  } catch {
    return null;
  }
}

function coincideAlgunPrefijo(pathname: string, prefijos: string[]): boolean {
  return prefijos.some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const sesion = await leerSesion(request);

  const esConfigMutable = pathname === "/api/config" && request.method !== "GET";

  const requiereFuncionario =
    coincideAlgunPrefijo(pathname, RUTAS_FUNCIONARIO) ||
    coincideAlgunPrefijo(pathname, API_FUNCIONARIO) ||
    esConfigMutable;
  const requiereSesion =
    requiereFuncionario ||
    coincideAlgunPrefijo(pathname, RUTAS_ADMINISTRADO) ||
    coincideAlgunPrefijo(pathname, API_SESION_REQUERIDA);

  if (requiereFuncionario && (!sesion || sesion.rol !== "funcionario")) {
    return denegarAcceso(request, sesion, pathname);
  }

  if (requiereSesion && !sesion) {
    return denegarAcceso(request, sesion, pathname);
  }

  return NextResponse.next();
}

function denegarAcceso(
  request: NextRequest,
  sesion: SesionEdge | null,
  pathname: string,
): NextResponse {
  if (pathname.startsWith("/api/")) {
    const status = sesion ? 403 : 401;
    return NextResponse.json(
      { error: sesion ? "No tienes permiso para acceder a este recurso." : "Debes iniciar sesión." },
      { status },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirigidoDesde", pathname);
  return NextResponse.redirect(loginUrl);
}
