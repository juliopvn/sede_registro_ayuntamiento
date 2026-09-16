"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function FormularioActuacion({ expedienteId }: { expedienteId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const response = await fetch(`/api/expedientes/${expedienteId}/actuaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "No se ha podido añadir la actuación.");
      }

      setTexto("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <textarea
        required
        rows={3}
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        placeholder="Describe la actuación realizada…"
        className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
      />
      {error && <p className="text-sm text-seal-dark">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-sm bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink-soft disabled:opacity-50"
      >
        {enviando ? "Añadiendo…" : "Añadir actuación"}
      </button>
    </form>
  );
}
