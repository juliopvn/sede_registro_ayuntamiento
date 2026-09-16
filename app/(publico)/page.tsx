import Link from "next/link";
import { getConfigHome } from "@/lib/config";
import { Sello } from "@/components/Sello";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getConfigHome();
  const fechaHoy = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date());

  return (
    <div className="textura-papel">
      <section className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-12 px-6 py-16 md:flex-row md:py-24">
        <div className="flex-1 space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal">
            {config.nombreOrganismo}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-medium text-ink md:text-6xl">
            {config.tituloHero}
          </h1>
          <p className="max-w-xl text-lg text-slate">{config.subtituloHero}</p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/administrado/instancias/nueva"
              className="rounded-sm bg-seal px-6 py-3 font-medium text-paper transition hover:bg-seal-dark"
            >
              Presentar instancia
            </Link>
            <Link
              href="/login"
              className="rounded-sm border border-ink px-6 py-3 font-medium text-ink transition hover:bg-ink hover:text-paper"
            >
              Acceder a la Sede
            </Link>
          </div>
        </div>

        <Sello titulo="Registro General" subtitulo={fechaHoy} tamano="grande" />
      </section>

      <section className="border-y border-line bg-paper-dim">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="max-w-3xl font-sans text-base leading-relaxed text-slate">{config.textoIntro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-ink">
          Cómo funciona
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          <PasoProceso
            numero="01"
            titulo="Accede con tu email"
            texto="Solicita un enlace de acceso de un solo uso: no necesitas recordar contraseñas."
          />
          <PasoProceso
            numero="02"
            titulo="Presenta tu instancia"
            texto="Completa el formulario de instancia general y adjunta la documentación necesaria."
          />
          <PasoProceso
            numero="03"
            titulo="Sigue la tramitación"
            texto="Consulta tus presentaciones y su estado desde tu área personal en cualquier momento."
          />
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-sm border border-line bg-paper px-8 py-8 font-mono text-sm text-slate">
          <p className="uppercase tracking-wide text-slate-dim">Atención al ciudadano</p>
          <p className="mt-2 text-ink">{config.contactoEmail}</p>
          <p className="text-ink">{config.contactoTelefono}</p>
        </div>
      </section>
    </div>
  );
}

function PasoProceso({ numero, titulo, texto }: { numero: string; titulo: string; texto: string }) {
  return (
    <li className="border-t-2 border-ink pt-4">
      <span className="font-mono text-sm text-seal">{numero}</span>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-medium text-ink">
        {titulo}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate">{texto}</p>
    </li>
  );
}
