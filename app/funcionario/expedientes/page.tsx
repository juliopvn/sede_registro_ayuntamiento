import Link from "next/link";
import { expedientesCollection } from "@/lib/db";
import { FormularioBusqueda } from "@/components/FormularioBusqueda";
import type { EstadoExpediente } from "@/lib/types";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short" });

const PESTANAS: Array<{ valor: "abierto" | "cerrado" | "todos"; etiqueta: string }> = [
  { valor: "abierto", etiqueta: "Abiertos" },
  { valor: "cerrado", etiqueta: "Cerrados" },
  { valor: "todos", etiqueta: "Todos" },
];

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  const busqueda = q?.trim();
  const pestanaActiva = estado === "cerrado" || estado === "todos" ? estado : "abierto";

  const filtro: Record<string, unknown> = {};
  if (pestanaActiva === "abierto") {
    filtro.estado = { $ne: "cerrado" satisfies EstadoExpediente };
  } else if (pestanaActiva === "cerrado") {
    filtro.estado = "cerrado" satisfies EstadoExpediente;
  }
  if (busqueda) {
    filtro.$or = [
      { codigo: { $regex: busqueda, $options: "i" } },
      { "sujeto.nombre": { $regex: busqueda, $options: "i" } },
      { "sujeto.email": { $regex: busqueda, $options: "i" } },
    ];
  }

  const expedientes = await (await expedientesCollection())
    .find(filtro)
    .sort({ creadoEn: -1 })
    .toArray();

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal">Funcionario</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-ink">
        Expedientes
      </h1>

      <div className="mt-6 flex gap-1 border-b border-line">
        {PESTANAS.map((pestana) => {
          const params = new URLSearchParams();
          if (pestana.valor !== "abierto") params.set("estado", pestana.valor);
          if (busqueda) params.set("q", busqueda);
          const href = params.size > 0 ? `?${params.toString()}` : "?";
          const activa = pestana.valor === pestanaActiva;

          return (
            <Link
              key={pestana.valor}
              href={href}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                activa ? "border-seal text-ink" : "border-transparent text-slate-dim hover:text-ink"
              }`}
            >
              {pestana.etiqueta}
            </Link>
          );
        })}
      </div>

      <FormularioBusqueda placeholder="Buscar por código, nombre o email…" />

      {expedientes.length === 0 ? (
        <p className="mt-10 text-center text-slate">No hay expedientes que coincidan con la búsqueda.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {expedientes.map((expediente) => (
            <li key={expediente._id.toString()}>
              <Link
                href={`/funcionario/expedientes/${expediente._id.toString()}`}
                className="flex items-center justify-between gap-6 py-5 hover:bg-paper-dim"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-ink">{expediente.codigo}</p>
                  <p className="mt-1 text-sm text-slate">
                    {expediente.sujeto.nombre} · {expediente.sujeto.email}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-sm px-2.5 py-1 font-mono text-[11px] uppercase ${
                      expediente.estado === "cerrado"
                        ? "bg-paper-dim text-slate-dim"
                        : "bg-green/10 text-green"
                    }`}
                  >
                    {expediente.estado === "cerrado" ? "Cerrado" : "Abierto"}
                  </span>
                  <p className="mt-2 font-mono text-xs text-slate-dim">{formateadorFecha.format(expediente.creadoEn)}</p>
                  <p className="mt-1 text-xs text-slate-dim">
                    {expediente.actuaciones.length} actuación{expediente.actuaciones.length === 1 ? "" : "es"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
