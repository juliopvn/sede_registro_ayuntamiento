"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotonCerrarExpediente({ expedienteId }: { expedienteId: string }) {
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  async function cerrarExpediente() {
    setCerrando(true);
    setError(null);
    try {
      const response = await fetch(`/api/expedientes/${expedienteId}/cerrar`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "No se ha podido cerrar el expediente.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCerrando(false);
      setConfirmando(false);
    }
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate">¿Cerrar este expediente?</span>
        <button
          type="button"
          onClick={cerrarExpediente}
          disabled={cerrando}
          className="rounded-sm bg-seal px-3 py-1.5 text-sm font-medium text-paper transition hover:bg-seal-dark disabled:opacity-50"
        >
          {cerrando ? "Cerrando…" : "Sí, cerrar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={cerrando}
          className="rounded-sm border border-line px-3 py-1.5 text-sm text-slate transition hover:bg-paper-dim"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded-sm border border-ink px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink hover:text-paper"
      >
        Cerrar expediente
      </button>
      {error && <p className="mt-1 text-xs text-seal-dark">{error}</p>}
    </div>
  );
}
