import { configCollection } from "@/lib/db";
import type { ConfigHome } from "@/lib/types";

export const CONFIG_DOC_ID = "home";

export const DEFAULT_CONFIG: Omit<ConfigHome, "_id" | "actualizadoEn"> = {
  nombreOrganismo: "Ayuntamiento de Ejemplo",
  tituloHero: "Registro General de entrada y salida",
  subtituloHero:
    "Presenta tu instancia general en línea y haz seguimiento de su tramitación sin desplazarte.",
  textoIntro:
    "La Sede Electrónica te permite presentar solicitudes, escritos y comunicaciones dirigidas a la Administración desde cualquier lugar, con la misma validez que el registro presencial.",
  contactoEmail: "registro@example.com",
  contactoTelefono: "900 000 000",
};

export async function getConfigHome(): Promise<ConfigHome> {
  const config = await (await configCollection()).findOne({ _id: CONFIG_DOC_ID });
  return config ?? { _id: CONFIG_DOC_ID, ...DEFAULT_CONFIG, actualizadoEn: new Date() };
}
