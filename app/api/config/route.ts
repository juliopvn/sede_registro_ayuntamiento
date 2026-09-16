import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { configCollection } from "@/lib/db";
import { CONFIG_DOC_ID, getConfigHome } from "@/lib/config";
import { requireRole, withApiErrorHandling } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const config = await getConfigHome();
  return NextResponse.json({ config });
}

const putSchema = z.object({
  nombreOrganismo: z.string().min(1),
  tituloHero: z.string().min(1),
  subtituloHero: z.string().min(1),
  textoIntro: z.string().min(1),
  contactoEmail: z.string().email(),
  contactoTelefono: z.string().min(1),
});

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    await requireRole("funcionario");
    const parsed = putSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de configuración inválidos." },
        { status: 400 },
      );
    }

    const actualizadoEn = new Date();
    await (await configCollection()).updateOne(
      { _id: CONFIG_DOC_ID },
      { $set: { ...parsed.data, actualizadoEn } },
      { upsert: true },
    );

    return NextResponse.json({ config: { _id: CONFIG_DOC_ID, ...parsed.data, actualizadoEn } });
  });
}
