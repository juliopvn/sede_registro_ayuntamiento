"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotonCrearExpediente({ registroId }: { registroId: string }) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crearExpediente() {
    setCreando(true);
    setError(null);
    try {
      const response = await fetch("/api/expedientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroId, tipo: "general" }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "No se ha podido crear el expediente.");
      }

      const { expediente } = (await response.json()) as { expediente: { _id: string } };
      router.push(`/funcionario/expedientes/${expediente._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setCreando(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={crearExpediente}
        disabled={creando}
        className="rounded-sm border border-ink px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-ink hover:text-paper disabled:opacity-50"
      >
        {creando ? "Creando…" : "Crear expediente"}
      </button>
      {error && <p className="mt-1 text-xs text-seal-dark">{error}</p>}
    </div>
  );
}
