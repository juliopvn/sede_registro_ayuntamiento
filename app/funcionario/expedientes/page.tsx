import Link from "next/link";
import { expedientesCollection } from "@/lib/db";
import { FormularioBusqueda } from "@/components/FormularioBusqueda";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short" });

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busqueda = q?.trim();

  const filtro: Record<string, unknown> = busqueda
    ? {
        $or: [
          { codigo: { $regex: busqueda, $options: "i" } },
          { "sujeto.nombre": { $regex: busqueda, $options: "i" } },
          { "sujeto.email": { $regex: busqueda, $options: "i" } },
        ],
      }
    : {};

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
                  <p className="font-mono text-xs text-slate-dim">{formateadorFecha.format(expediente.creadoEn)}</p>
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
