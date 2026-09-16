"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { subirAdjunto, type AdjuntoSubido } from "@/lib/client/subirAdjunto";

interface Persona {
  nombre: string;
  nif: string;
  direccionFiscal: string;
}

const PERSONA_VACIA: Persona = { nombre: "", nif: "", direccionFiscal: "" };

interface AdjuntoEnProgreso {
  id: string;
  nombre: string;
  progreso: number;
  error?: string;
  subido?: AdjuntoSubido;
}

export default function NuevaInstanciaPage() {
  const router = useRouter();
  const [borradorId] = useState(() => crypto.randomUUID());

  const [interesado, setInteresado] = useState<Persona>(PERSONA_VACIA);
  const [tieneRepresentante, setTieneRepresentante] = useState(false);
  const [representante, setRepresentante] = useState<Persona>(PERSONA_VACIA);
  const [expone, setExpone] = useState("");
  const [solicita, setSolicita] = useState("");
  const [adjuntos, setAdjuntos] = useState<AdjuntoEnProgreso[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSeleccionarFicheros(event: ChangeEvent<HTMLInputElement>) {
    const ficheros = Array.from(event.target.files ?? []);
    event.target.value = "";

    for (const fichero of ficheros) {
      const id = crypto.randomUUID();
      setAdjuntos((prev) => [...prev, { id, nombre: fichero.name, progreso: 0 }]);

      try {
        const subido = await subirAdjunto(fichero, borradorId, (progreso) => {
          setAdjuntos((prev) => prev.map((a) => (a.id === id ? { ...a, progreso } : a)));
        });
        setAdjuntos((prev) => prev.map((a) => (a.id === id ? { ...a, progreso: 100, subido } : a)));
      } catch (err) {
        setAdjuntos((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, error: err instanceof Error ? err.message : "Error al subir el fichero." }
              : a,
          ),
        );
      }
    }
  }

  function quitarAdjunto(id: string) {
    setAdjuntos((prev) => prev.filter((a) => a.id !== id));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const subiendoTodavia = adjuntos.some((a) => !a.subido && !a.error);
    if (subiendoTodavia) {
      setError("Espera a que terminen de subirse todos los adjuntos.");
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interesado,
          representante: tieneRepresentante ? representante : null,
          expone,
          solicita,
          adjuntos: adjuntos.filter((a) => a.subido).map((a) => a.subido),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "No se ha podido presentar la instancia.");
      }

      router.push("/administrado/instancias?presentada=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal">Instancia general</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-ink">
        Presentar instancia
      </h1>
      <p className="mt-2 text-sm text-slate">
        Completa los datos del interesado, expón el motivo de tu solicitud y adjunta la documentación
        necesaria.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-10">
        <fieldset className="space-y-4">
          <legend className="font-[family-name:var(--font-display)] text-lg font-medium text-ink">
            Interesado
          </legend>
          <PersonaCampos valor={interesado} onCambio={setInteresado} prefijo="interesado" />
        </fieldset>

        <fieldset className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={tieneRepresentante}
              onChange={(event) => setTieneRepresentante(event.target.checked)}
              className="h-4 w-4 accent-seal"
            />
            Actúo a través de representante
          </label>
          {tieneRepresentante && (
            <PersonaCampos valor={representante} onCambio={setRepresentante} prefijo="representante" />
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-[family-name:var(--font-display)] text-lg font-medium text-ink">
            Exposición y solicitud
          </legend>
          <Campo etiqueta="Expone" htmlFor="expone">
            <textarea
              id="expone"
              required
              rows={4}
              value={expone}
              onChange={(event) => setExpone(event.target.value)}
              className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
            />
          </Campo>
          <Campo etiqueta="Solicita" htmlFor="solicita">
            <textarea
              id="solicita"
              required
              rows={4}
              value={solicita}
              onChange={(event) => setSolicita(event.target.value)}
              className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
            />
          </Campo>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-[family-name:var(--font-display)] text-lg font-medium text-ink">
            Documentación adjunta
          </legend>
          <input
            type="file"
            multiple
            onChange={onSeleccionarFicheros}
            className="block w-full text-sm text-slate file:mr-4 file:rounded-sm file:border file:border-ink file:bg-paper file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-ink hover:file:text-paper"
          />
          {adjuntos.length > 0 && (
            <ul className="space-y-2">
              {adjuntos.map((adjunto) => (
                <li
                  key={adjunto.id}
                  className="flex items-center justify-between gap-4 rounded-sm border border-line px-4 py-2 text-sm"
                >
                  <span className="truncate text-ink">{adjunto.nombre}</span>
                  <div className="flex items-center gap-3">
                    {adjunto.error ? (
                      <span className="text-seal-dark">{adjunto.error}</span>
                    ) : adjunto.progreso < 100 ? (
                      <span className="font-mono text-xs text-slate-dim">{adjunto.progreso}%</span>
                    ) : (
                      <span className="font-mono text-xs text-green">Subido</span>
                    )}
                    <button
                      type="button"
                      onClick={() => quitarAdjunto(adjunto.id)}
                      className="text-slate-dim hover:text-seal"
                      aria-label={`Quitar ${adjunto.nombre}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="rounded-sm border border-seal/40 bg-seal/5 px-4 py-3 text-sm text-seal-dark">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-sm bg-seal px-6 py-3 font-medium text-paper transition hover:bg-seal-dark disabled:opacity-50 md:w-auto"
        >
          {enviando ? "Presentando…" : "Presentar instancia"}
        </button>
      </form>
    </div>
  );
}

function PersonaCampos({
  valor,
  onCambio,
  prefijo,
}: {
  valor: Persona;
  onCambio: (persona: Persona) => void;
  prefijo: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Campo etiqueta="Nombre y apellidos" htmlFor={`${prefijo}-nombre`}>
        <input
          id={`${prefijo}-nombre`}
          required
          value={valor.nombre}
          onChange={(event) => onCambio({ ...valor, nombre: event.target.value })}
          className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </Campo>
      <Campo etiqueta="NIF / NIE" htmlFor={`${prefijo}-nif`}>
        <input
          id={`${prefijo}-nif`}
          required
          value={valor.nif}
          onChange={(event) => onCambio({ ...valor, nif: event.target.value })}
          className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </Campo>
      <Campo etiqueta="Dirección fiscal" htmlFor={`${prefijo}-direccion`}>
        <input
          id={`${prefijo}-direccion`}
          required
          value={valor.direccionFiscal}
          onChange={(event) => onCambio({ ...valor, direccionFiscal: event.target.value })}
          className="w-full rounded-sm border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </Campo>
    </div>
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
