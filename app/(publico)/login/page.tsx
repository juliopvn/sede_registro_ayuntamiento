"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sello } from "@/components/Sello";

const MENSAJES_ERROR: Record<string, string> = {
  token_invalido: "El enlace no es válido. Solicita uno nuevo.",
  token_expirado: "El enlace ha caducado. Solicita uno nuevo.",
  token_usado: "Este enlace ya se ha utilizado. Solicita uno nuevo.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorInicial = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(
    errorInicial ? (MENSAJES_ERROR[errorInicial] ?? "No se ha podido verificar el acceso.") : null,
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "No se ha podido enviar el enlace.");
      }

      router.push(`/login/revisa-tu-correo?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 px-6 py-20 text-center">
      <Sello titulo="Acceso" subtitulo="Sede electrónica" />

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium text-ink">
          Accede a la Sede
        </h1>
        <p className="mt-2 text-sm text-slate">
          Te enviaremos un enlace de acceso de un solo uso a tu correo. No necesitas contraseña.
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full space-y-4 text-left">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@example.com"
            className="mt-1 w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-sm border border-seal/40 bg-seal/5 px-3 py-2 text-sm text-seal-dark">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-sm bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink-soft disabled:opacity-50"
        >
          {enviando ? "Enviando enlace…" : "Enviar enlace de acceso"}
        </button>
      </form>
    </div>
  );
}
