import { ObjectId } from "mongodb";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { registrosCollection } from "@/lib/db";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" });

export default async function MisPresentacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ presentada?: string }>;
}) {
  const { presentada } = await searchParams;
  const usuario = await getSession();

  const registros = usuario
    ? await (await registrosCollection())
        .find({ usuarioId: new ObjectId(usuario.id) })
        .sort({ creadoEn: -1 })
        .toArray()
    : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal">Área personal</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-ink">
        Mis presentaciones
      </h1>

      {presentada && (
        <p className="mt-4 rounded-sm border border-green/30 bg-green/5 px-4 py-3 text-sm text-green">
          Tu instancia se ha registrado correctamente.
        </p>
      )}

      {registros.length === 0 ? (
        <div className="mt-10 rounded-sm border border-dashed border-line px-6 py-12 text-center">
          <p className="text-slate">Todavía no has presentado ninguna instancia.</p>
          <Link href="/administrado/instancias/nueva" className="mt-4 inline-block text-seal underline">
            Presentar tu primera instancia
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {registros.map((registro) => (
            <li key={registro._id.toString()} className="flex items-start justify-between gap-6 py-5">
              <div>
                <p className="font-medium text-ink">{registro.interesado.nombre}</p>
                <p className="mt-1 text-sm text-slate">{registro.expone}</p>
                {registro.adjuntos.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-slate-dim">
                    {registro.adjuntos.length} adjunto{registro.adjuntos.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-slate-dim">{formateadorFecha.format(registro.creadoEn)}</p>
                <span className="mt-2 inline-block rounded-sm bg-paper-dim px-2.5 py-1 font-mono text-[11px] uppercase text-ink">
                  {registro.estado === "presentado" ? "Presentado" : "En trámite"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
