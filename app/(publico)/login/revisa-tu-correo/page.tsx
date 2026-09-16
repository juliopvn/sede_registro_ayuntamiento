import { Sello } from "@/components/Sello";

export default async function RevisaTuCorreoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 px-6 py-20 text-center">
      <Sello titulo="Enviado" subtitulo="Revisa tu correo" />

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium text-ink">
          Revisa tu correo
        </h1>
        <p className="mt-3 text-sm text-slate">
          {email ? (
            <>
              Hemos enviado un enlace de acceso a <strong className="text-ink">{email}</strong>.
            </>
          ) : (
            "Hemos enviado un enlace de acceso a tu correo."
          )}{" "}
          Caduca en 15 minutos y solo puede usarse una vez.
        </p>
      </div>
    </div>
  );
}
