import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { expedientesCollection } from "@/lib/db";
import { requireRole, withApiErrorHandling } from "@/lib/rbac";
import type { Actuacion } from "@/lib/types";

const bodySchema = z.object({
  texto: z.string().min(1, "El texto de la actuación es obligatorio."),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    const funcionario = await requireRole("funcionario");
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const actuacion: Actuacion = {
      fecha: new Date(),
      texto: parsed.data.texto,
      autorEmail: funcionario.email,
    };

    const collection = await expedientesCollection();
    const resultado = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $push: { actuaciones: actuacion } },
      { returnDocument: "after" },
    );

    if (!resultado) {
      return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ expediente: resultado }, { status: 201 });
  });
}
