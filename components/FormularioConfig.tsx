"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { ConfigHome } from "@/lib/types";

type CamposConfig = Omit<ConfigHome, "_id" | "actualizadoEn">;

export function FormularioConfig({ configInicial }: { configInicial: ConfigHome }) {
  const [valores, setValores] = useState<CamposConfig>({
    nombreOrganismo: configInicial.nombreOrganismo,
    tituloHero: configInicial.tituloHero,
    subtituloHero: configInicial.subtituloHero,
    textoIntro: configInicial.textoIntro,
    contactoEmail: configInicial.contactoEmail,
    contactoTelefono: configInicial.contactoTelefono,
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function actualizar<K extends keyof CamposConfig>(campo: K, valor: CamposConfig[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valores),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "No se ha podido guardar la configuración.");
      }

      setMensaje("Cambios guardados. La home ya los refleja.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Campo etiqueta="Nombre del organismo" htmlFor="nombreOrganismo">
        <input
          id="nombreOrganismo"
          required
          value={valores.nombreOrganismo}
          onChange={(event) => actualizar("nombreOrganismo", event.target.value)}
          className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </Campo>

      <Campo etiqueta="Título del hero" htmlFor="tituloHero">
        <input
          id="tituloHero"
          required
          value={valores.tituloHero}
          onChange={(event) => actualizar("tituloHero", event.target.value)}
          className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </Campo>

      <Campo etiqueta="Subtítulo del hero" htmlFor="subtituloHero">
        <textarea
          id="subtituloHero"
          required
          rows={2}
          value={valores.subtituloHero}
          onChange={(event) => actualizar("subtituloHero", event.target.value)}
          className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </Campo>

      <Campo etiqueta="Texto de introducción" htmlFor="textoIntro">
        <textarea
          id="textoIntro"
          required
          rows={4}
          value={valores.textoIntro}
          onChange={(event) => actualizar("textoIntro", event.target.value)}
          className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </Campo>

      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Email de contacto" htmlFor="contactoEmail">
          <input
            id="contactoEmail"
            type="email"
            required
            value={valores.contactoEmail}
            onChange={(event) => actualizar("contactoEmail", event.target.value)}
            className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
          />
        </Campo>
        <Campo etiqueta="Teléfono de contacto" htmlFor="contactoTelefono">
          <input
            id="contactoTelefono"
            required
            value={valores.contactoTelefono}
            onChange={(event) => actualizar("contactoTelefono", event.target.value)}
            className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
          />
        </Campo>
      </div>

      {mensaje && <p className="text-sm text-green">{mensaje}</p>}
      {error && <p className="text-sm text-seal-dark">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="rounded-sm bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink-soft disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

function Campo({
  etiqueta,
  htmlFor,
  children,
}: {
  etiqueta: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {etiqueta}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
