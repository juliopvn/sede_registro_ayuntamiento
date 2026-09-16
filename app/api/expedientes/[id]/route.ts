import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { expedientesCollection } from "@/lib/db";
import { requireRole, withApiErrorHandling } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    await requireRole("funcionario");
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const expediente = await (await expedientesCollection()).findOne({ _id: new ObjectId(id) });
    if (!expediente) {
      return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ expediente });
  });
}
