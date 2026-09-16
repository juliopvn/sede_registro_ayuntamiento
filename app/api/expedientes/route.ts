import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { expedientesCollection, registrosCollection } from "@/lib/db";
import { requireRole, withApiErrorHandling } from "@/lib/rbac";
import type { EstadoExpediente, Expediente, TipoExpediente } from "@/lib/types";

const TIPOS_VALIDOS: TipoExpediente[] = ["general", "urbanismo", "tributario", "subvenciones", "otros"];
const ESTADOS_VALIDOS: EstadoExpediente[] = ["abierto", "cerrado"];

const crearExpedienteSchema = z.object({
  registroId: z.string().min(1),
  tipo: z.enum(TIPOS_VALIDOS as [TipoExpediente, ...TipoExpediente[]]).default("general"),
});

/** Código legible y ordenable: EXP-2026-000123 */
async function generarCodigo(): Promise<string> {
  const anio = new Date().getFullYear();
  const collection = await expedientesCollection();
  const total = await collection.countDocuments({
    creadoEn: { $gte: new Date(`${anio}-01-01T00:00:00.000Z`) },
  });
  const secuencial = String(total + 1).padStart(6, "0");
  return `EXP-${anio}-${secuencial}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    const funcionario = await requireRole("funcionario");
    const parsed = crearExpedienteSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de expediente inválidos." },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(parsed.data.registroId)) {
      return NextResponse.json({ error: "registroId inválido." }, { status: 400 });
    }

    const registro = await (await registrosCollection()).findOne({
      _id: new ObjectId(parsed.data.registroId),
    });

    if (!registro) {
      return NextResponse.json({ error: "El registro de origen no existe." }, { status: 404 });
    }

    const codigo = await generarCodigo();
    const expediente: Expediente = {
      _id: new ObjectId(),
      codigo,
      registroId: registro._id,
      sujeto: {
        usuarioId: registro.usuarioId,
        nombre: registro.interesado.nombre,
        email: registro.usuarioEmail,
      },
      tipo: parsed.data.tipo,
      estado: "abierto",
      actuaciones: [
        {
          fecha: new Date(),
          texto: `Expediente incoado a partir del registro de entrada por ${funcionario.email}.`,
          autorEmail: funcionario.email,
        },
      ],
      creadoEn: new Date(),
      cerradoEn: null,
    };

    await (await expedientesCollection()).insertOne(expediente);

    return NextResponse.json(
      { expediente: { ...expediente, _id: expediente._id.toString() } },
      { status: 201 },
    );
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    await requireRole("funcionario");
    const busqueda = request.nextUrl.searchParams.get("q")?.trim();
    const estadoParam = request.nextUrl.searchParams.get("estado");

    const filtro: Record<string, unknown> = {};
    if (estadoParam && ESTADOS_VALIDOS.includes(estadoParam as EstadoExpediente)) {
      filtro.estado = estadoParam;
    }
    if (busqueda) {
      filtro.$or = [
        { codigo: { $regex: busqueda, $options: "i" } },
        { "sujeto.nombre": { $regex: busqueda, $options: "i" } },
        { "sujeto.email": { $regex: busqueda, $options: "i" } },
      ];
    }

    const expedientes = await (await expedientesCollection())
      .find(filtro)
      .sort({ creadoEn: -1 })
      .toArray();

    return NextResponse.json({ expedientes });
  });
}
