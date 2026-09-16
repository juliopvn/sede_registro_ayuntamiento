import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { expedientesCollection, registrosCollection } from "@/lib/db";
import { FormularioActuacion } from "@/components/FormularioActuacion";
import { BotonCerrarExpediente } from "@/components/BotonCerrarExpediente";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" });

export default async function ExpedienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const expediente = await (await expedientesCollection()).findOne({ _id: new ObjectId(id) });
  if (!expediente) notFound();

  const registro = await (await registrosCollection()).findOne({ _id: expediente.registroId });
  const cerrado = expediente.estado === "cerrado";

  const actuaciones = [...expediente.actuaciones].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal">Expediente</p>
          <h1 className="mt-2 font-mono text-3xl font-medium text-ink">{expediente.codigo}</h1>
          <p className="mt-2 text-sm text-slate">
            {expediente.sujeto.nombre} · {expediente.sujeto.email} · Tipo: {expediente.tipo}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-sm px-3 py-1.5 font-mono text-xs uppercase ${
            cerrado ? "bg-paper-dim text-slate-dim" : "bg-green/10 text-green"
          }`}
        >
          {cerrado ? "Cerrado" : "Abierto"}
        </span>
      </div>

      {registro && (
        <div className="mt-6 rounded-sm border border-line bg-paper-dim px-5 py-4 text-sm text-slate">
          <p className="font-medium text-ink">Registro de origen</p>
          <p className="mt-1">{registro.expone}</p>
          <p className="mt-2 font-mono text-xs text-slate-dim">
            Solicita: {registro.solicita}
          </p>
        </div>
      )}

      <section className="mt-10">
        {cerrado ? (
          <p className="rounded-sm border border-line bg-paper-dim px-4 py-3 text-sm text-slate-dim">
            Este expediente está cerrado
            {expediente.cerradoEn
              ? ` desde el ${formateadorFecha.format(expediente.cerradoEn)}`
              : ""}
            . No admite nuevas actuaciones.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-ink">
                Añadir actuación
              </h2>
              <BotonCerrarExpediente expedienteId={expediente._id.toString()} />
            </div>
            <div className="mt-4">
              <FormularioActuacion expedienteId={expediente._id.toString()} />
            </div>
          </>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-ink">
          Línea de actuaciones
        </h2>
        <ol className="mt-6 space-y-6 border-l border-line pl-6">
          {actuaciones.map((actuacion, index) => (
            <li key={index} className="relative">
              <span className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full bg-seal" />
              <p className="font-mono text-xs text-slate-dim">{formateadorFecha.format(actuacion.fecha)}</p>
              <p className="mt-1 text-sm text-ink">{actuacion.texto}</p>
              <p className="mt-1 text-xs text-slate-dim">{actuacion.autorEmail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
