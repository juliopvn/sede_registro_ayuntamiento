import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { registrosCollection } from "@/lib/db";
import { AuthError, requireSession, withApiErrorHandling } from "@/lib/rbac";
import { getPresignedDownloadUrl } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    const usuario = await requireSession();
    const { id } = await params;
    const key = request.nextUrl.searchParams.get("key");

    if (!key || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const registro = await (await registrosCollection()).findOne({ _id: new ObjectId(id) });
    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    }

    const esPropietario = registro.usuarioId.toString() === usuario.id;
    if (usuario.rol !== "funcionario" && !esPropietario) {
      throw new AuthError(403, "No tienes permiso para descargar este adjunto.");
    }

    const existe = registro.adjuntos.some((adjunto) => adjunto.key === key);
    if (!existe) {
      return NextResponse.json({ error: "Adjunto no encontrado en este registro." }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(key);
    return NextResponse.redirect(url);
  });
}
