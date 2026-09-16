"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function FormularioBusqueda({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(searchParams.get("q") ?? "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (valor.trim()) {
      params.set("q", valor.trim());
    } else {
      params.delete("q");
    }
    params.delete("pagina");
    router.push(`?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex gap-2">
      <input
        type="search"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        placeholder={placeholder}
        className="w-full max-w-sm rounded-sm border border-line bg-paper px-4 py-2 text-sm text-ink outline-none focus:border-ink"
      />
      <button
        type="submit"
        className="rounded-sm border border-ink px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink hover:text-paper"
      >
        Buscar
      </button>
    </form>
  );
}
