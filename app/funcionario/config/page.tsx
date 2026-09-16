import { getConfigHome } from "@/lib/config";
import { FormularioConfig } from "@/components/FormularioConfig";

export const dynamic = "force-dynamic";

export default async function ConfigHomePage() {
  const config = await getConfigHome();

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal">Funcionario</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-ink">
        Configurar la home
      </h1>
      <p className="mt-2 text-sm text-slate">
        Estos textos son los que ve cualquier visitante en la página pública de la Sede.
      </p>

      <div className="mt-10">
        <FormularioConfig configInicial={config} />
      </div>
    </div>
  );
}
