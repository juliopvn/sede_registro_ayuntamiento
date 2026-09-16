interface SelloProps {
  titulo: string;
  subtitulo: string;
  tamano?: "grande" | "normal";
}

/**
 * El sello de registro: elemento firma visual del proyecto, evoca el
 * tampón oficial que estampa fecha/hora sobre un documento presentado.
 */
export function Sello({ titulo, subtitulo, tamano = "normal" }: SelloProps) {
  const dimension = tamano === "grande" ? "h-56 w-56 md:h-64 md:w-64" : "h-36 w-36";
  const textoTitulo = tamano === "grande" ? "text-sm md:text-base" : "text-[11px]";
  const textoSubtitulo = tamano === "grande" ? "text-xs md:text-sm" : "text-[9px]";

  return (
    <div className={`sello ${dimension} shrink-0 px-4`} aria-hidden="true">
      <div className="flex flex-col items-center gap-1">
        <span className={`font-semibold uppercase ${textoTitulo}`}>{titulo}</span>
        <span className={`h-px w-10 bg-current opacity-50`} />
        <span className={`uppercase opacity-80 ${textoSubtitulo}`}>{subtitulo}</span>
      </div>
    </div>
  );
}
