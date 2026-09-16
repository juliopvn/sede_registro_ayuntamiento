import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { expedientesCollection } from "@/lib/db";
import { requireRole, withApiErrorHandling } from "@/lib/rbac";
import type { Actuacion } from "@/lib/types";

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

    const cierre: Date = new Date();
    const actuacionCierre: Actuacion = {
      fecha: cierre,
      texto: `Expediente cerrado por ${funcionario.email}.`,
      autorEmail: funcionario.email,
    };

    const collection = await expedientesCollection();
    const resultado = await collection.findOneAndUpdate(
      { _id: new ObjectId(id), estado: { $ne: "cerrado" } },
      {
        $set: { estado: "cerrado", cerradoEn: cierre },
        $push: { actuaciones: actuacionCierre },
      },
      { returnDocument: "after" },
    );

    if (!resultado) {
      const existe = await collection.findOne({ _id: new ObjectId(id) });
      if (!existe) {
        return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });
      }
      return NextResponse.json({ error: "El expediente ya está cerrado." }, { status: 409 });
    }

    return NextResponse.json({ expediente: resultado });
  });
}
