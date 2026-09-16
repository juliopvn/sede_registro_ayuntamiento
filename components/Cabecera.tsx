"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGlobalContext } from "@/context/GlobalContext";

export function Cabecera() {
  const { usuario, setUsuario } = useGlobalContext();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function cerrarSesion() {
    setCerrandoSesion(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setUsuario(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-ink"
        >
          Sede·Electrónica
        </Link>

        <nav className="flex items-center gap-5 font-sans text-sm">
          {usuario?.rol === "administrado" && (
            <>
              <Link href="/administrado/instancias/nueva" className="text-ink hover:text-seal">
                Presentar instancia
              </Link>
              <Link href="/administrado/instancias" className="text-ink hover:text-seal">
                Mis presentaciones
              </Link>
            </>
          )}

          {usuario?.rol === "funcionario" && (
            <>
              <Link href="/funcionario/registros" className="text-ink hover:text-seal">
                Registros
              </Link>
              <Link href="/funcionario/expedientes" className="text-ink hover:text-seal">
                Expedientes
              </Link>
              <Link href="/funcionario/config" className="text-ink hover:text-seal">
                Configurar home
              </Link>
            </>
          )}

          {usuario ? (
            <div className="flex items-center gap-3 border-l border-line pl-5">
              <span className="text-slate-dim">{usuario.email}</span>
              <button
                type="button"
                onClick={cerrarSesion}
                disabled={cerrandoSesion}
                className="rounded-sm border border-ink px-3 py-1.5 font-medium text-ink transition hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                Salir
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-sm bg-ink px-4 py-1.5 font-medium text-paper transition hover:bg-ink-soft"
            >
              Acceder
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
