import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import { magicLinksCollection, usuariosCollection } from "@/lib/db";
import type { Rol, SessionUsuario } from "@/lib/types";

export const SESSION_COOKIE_NAME = "sede_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutos

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().APP_SESSION_SECRET);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Genera un token de un solo uso, lo persiste (hasheado) y devuelve el token
 * en claro para incluirlo en el enlace del email. Nunca se guarda en claro.
 */
export async function createMagicLinkToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = new Date();

  await (await magicLinksCollection()).insertOne({
    _id: new ObjectId(),
    email: email.toLowerCase().trim(),
    tokenHash,
    expiraEn: new Date(now.getTime() + MAGIC_LINK_TTL_MS),
    usadoEn: null,
    creadoEn: now,
  });

  return token;
}

export interface VerifyMagicLinkResult {
  ok: boolean;
  usuario?: SessionUsuario;
  error?: "token_invalido" | "token_expirado" | "token_usado";
}

/**
 * Valida el token de un solo uso, lo marca como usado de forma atómica
 * (evita condiciones de carrera en doble clic / reintentos) y resuelve o
 * crea el usuario correspondiente con su rol.
 */
export async function verifyMagicLinkToken(token: string): Promise<VerifyMagicLinkResult> {
  const tokenHash = hashToken(token);
  const now = new Date();

  const magicLinks = await magicLinksCollection();
  const link = await magicLinks.findOneAndUpdate(
    { tokenHash, usadoEn: null, expiraEn: { $gt: now } },
    { $set: { usadoEn: now } },
  );

  if (!link) {
    const existing = await magicLinks.findOne({ tokenHash });
    if (!existing) return { ok: false, error: "token_invalido" };
    if (existing.usadoEn) return { ok: false, error: "token_usado" };
    return { ok: false, error: "token_expirado" };
  }

  const usuarios = await usuariosCollection();
  let usuario = await usuarios.findOne({ email: link.email });

  if (!usuario) {
    const rol: Rol = "administrado";
    usuario = { _id: new ObjectId(), email: link.email, rol, creadoEn: now };
    await usuarios.insertOne(usuario);
  }

  return {
    ok: true,
    usuario: { id: usuario._id.toString(), email: usuario.email, rol: usuario.rol },
  };
}

export async function createSessionToken(usuario: SessionUsuario): Promise<string> {
  return new SignJWT({ email: usuario.email, rol: usuario.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function setSessionCookie(usuario: SessionUsuario): Promise<void> {
  const token = await createSessionToken(usuario);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function verifySessionToken(token: string): Promise<SessionUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    const rol = payload.rol === "funcionario" ? "funcionario" : "administrado";
    return { id: payload.sub, email: payload.email, rol };
  } catch {
    return null;
  }
}

/** Lee y valida la sesión actual desde la cookie httpOnly (server-side). */
export async function getSession(): Promise<SessionUsuario | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
