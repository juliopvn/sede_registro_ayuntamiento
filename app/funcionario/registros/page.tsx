import { registrosCollection } from "@/lib/db";
import { BotonCrearExpediente } from "@/components/BotonCrearExpediente";
import { FormularioBusqueda } from "@/components/FormularioBusqueda";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const formateadorFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" });

export default async function RegistrosFuncionarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q, pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam ?? "1") || 1);
  const busqueda = q?.trim();

  const filtro: Record<string, unknown> = busqueda
    ? {
        $or: [
          { "interesado.nombre": { $regex: busqueda, $options: "i" } },
          { "interesado.nif": { $regex: busqueda, $options: "i" } },
          { usuarioEmail: { $regex: busqueda, $options: "i" } },
        ],
      }
    : {};

  const collection = await registrosCollection();
  const [registros, total] = await Promise.all([
    collection
      .find(filtro)
      .sort({ creadoEn: -1 })
      .skip((pagina - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    collection.countDocuments(filtro),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal">Funcionario</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-ink">
        Registros de entrada
      </h1>
      <p className="mt-2 text-sm text-slate">
        Todas las instancias presentadas por los administrados. Crea un expediente para iniciar su
        tramitación.
      </p>

      <FormularioBusqueda placeholder="Buscar por nombre, NIF o email…" />

      {registros.length === 0 ? (
        <p className="mt-10 text-center text-slate">No hay registros que coincidan con la búsqueda.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {registros.map((registro) => (
            <li key={registro._id.toString()} className="flex items-start justify-between gap-6 py-5">
              <div>
                <p className="font-medium text-ink">{registro.interesado.nombre}</p>
                <p className="font-mono text-xs text-slate-dim">
                  {registro.interesado.nif} · {registro.usuarioEmail}
                </p>
                <p className="mt-2 text-sm text-slate">{registro.expone}</p>
                <p className="mt-1 font-mono text-xs text-slate-dim">
                  {formateadorFecha.format(registro.creadoEn)} · {registro.adjuntos.length} adjunto
                  {registro.adjuntos.length === 1 ? "" : "s"}
                </p>
              </div>
              <BotonCrearExpediente registroId={registro._id.toString()} />
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 && (
        <p className="mt-6 text-center font-mono text-xs text-slate-dim">
          Página {pagina} de {totalPaginas}
        </p>
      )}
    </div>
  );
}
