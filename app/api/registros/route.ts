import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { registrosCollection } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { withApiErrorHandling } from "@/lib/rbac";
import type { Registro } from "@/lib/types";

const personaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  nif: z.string().min(1, "El NIF/NIE es obligatorio."),
  direccionFiscal: z.string().min(1, "La dirección fiscal es obligatoria."),
});

const adjuntoSchema = z.object({
  key: z.string().min(1),
  nombreOriginal: z.string().min(1),
  tipo: z.string().min(1),
  tamano: z.number().nonnegative(),
});

const crearRegistroSchema = z.object({
  interesado: personaSchema,
  representante: personaSchema.nullable().optional(),
  expone: z.string().min(1, "El campo «expone» es obligatorio."),
  solicita: z.string().min(1, "El campo «solicita» es obligatorio."),
  adjuntos: z.array(adjuntoSchema).default([]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    const usuario = await requireSession();
    const parsed = crearRegistroSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de la instancia inválidos." },
        { status: 400 },
      );
    }

    const registro: Registro = {
      _id: new ObjectId(),
      usuarioId: new ObjectId(usuario.id),
      usuarioEmail: usuario.email,
      interesado: parsed.data.interesado,
      representante: parsed.data.representante ?? null,
      expone: parsed.data.expone,
      solicita: parsed.data.solicita,
      adjuntos: parsed.data.adjuntos,
      estado: "presentado",
      creadoEn: new Date(),
    };

    await (await registrosCollection()).insertOne(registro);

    return NextResponse.json(
      { registro: { ...registro, _id: registro._id.toString() } },
      { status: 201 },
    );
  });
}

const PAGE_SIZE = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiErrorHandling(async () => {
    const usuario = await requireSession();
    const pagina = Math.max(1, Number(request.nextUrl.searchParams.get("pagina") ?? "1") || 1);
    const busqueda = request.nextUrl.searchParams.get("q")?.trim();

    const filtro: Record<string, unknown> =
      usuario.rol === "administrado" ? { usuarioId: new ObjectId(usuario.id) } : {};

    if (busqueda) {
      filtro.$or = [
        { "interesado.nombre": { $regex: busqueda, $options: "i" } },
        { "interesado.nif": { $regex: busqueda, $options: "i" } },
        { usuarioEmail: { $regex: busqueda, $options: "i" } },
      ];
    }

    const collection = await registrosCollection();
    const [registros, total] = await Promise.all([
      collection
        .find(filtro)
        .sort({ creadoEn: -1 })
        .skip((pagina - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray(),
      collection.countDocuments(filtro),
    ]);

    return NextResponse.json({
      registros,
      paginacion: { pagina, totalPaginas: Math.max(1, Math.ceil(total / PAGE_SIZE)), total },
    });
  });
}
