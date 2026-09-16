import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession, withApiErrorHandling } from "@/lib/rbac";
import { buildAttachmentKey, getPresignedUploadUrl } from "@/lib/storage";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

const bodySchema = z.object({
  borradorId: z.string().min(1),
  nombreOriginal: z.string().min(1),
  tipo: z.string().min(1),
  tamano: z.number().positive().max(MAX_SIZE_BYTES, "El fichero supera el tamaño máximo (15 MB)."),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    await requireSession();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de adjunto inválidos." },
        { status: 400 },
      );
    }

    const { borradorId, nombreOriginal, tipo } = parsed.data;
    const key = buildAttachmentKey(borradorId, nombreOriginal);
    const uploadUrl = await getPresignedUploadUrl(key, tipo);

    return NextResponse.json({ key, uploadUrl });
  });
}
