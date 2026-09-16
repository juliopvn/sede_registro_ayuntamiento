/**
 * Seed idempotente de datos de ejemplo para desarrollo local y para la
 * suite de tests E2E. Ejecutar con: npx tsx --env-file=.env.local scripts/seed.ts
 */
import { ObjectId } from "mongodb";
import { getEnv } from "@/lib/env";
import { getDb } from "@/lib/db";
import { ensureBucket, putObject } from "@/lib/storage";
import { CONFIG_DOC_ID, DEFAULT_CONFIG } from "@/lib/config";
import type {
  ConfigHome,
  Expediente,
  Registro,
  Usuario,
} from "@/lib/types";

async function main() {
  const env = getEnv();
  const db = await getDb();

  console.log(`Conectado a ${db.databaseName}. Sembrando datos…`);

  // --- Usuarios -----------------------------------------------------------
  const usuarios = db.collection<Usuario>("usuarios");

  const funcionarioEmail = env.SEED_FUNCIONARIO_EMAIL ?? "funcionario@example.com";
  const administradoEmail = env.SEED_ADMINISTRADO_EMAIL ?? "administrado@example.com";
  const administradoEmail2 = "maria.lopez@example.com";
  const administradoEmail3 = "juan.perez@example.com";

  const usuariosSeed: Array<Omit<Usuario, "_id">> = [
    { email: funcionarioEmail, rol: "funcionario", creadoEn: new Date() },
    { email: administradoEmail, rol: "administrado", creadoEn: new Date() },
    { email: administradoEmail2, rol: "administrado", creadoEn: new Date() },
    { email: administradoEmail3, rol: "administrado", creadoEn: new Date() },
  ];

  const idsPorEmail = new Map<string, ObjectId>();
  for (const usuario of usuariosSeed) {
    const resultado = await usuarios.findOneAndUpdate(
      { email: usuario.email },
      { $setOnInsert: usuario },
      { upsert: true, returnDocument: "after" },
    );
    if (resultado) idsPorEmail.set(usuario.email, resultado._id);
  }
  console.log(`✔ ${usuariosSeed.length} usuarios asegurados.`);

  // --- Adjunto simulado en el bucket local ---------------------------------
  await ensureBucket();
  const keyAdjuntoEjemplo = "seed/dni-ejemplo.txt";
  await putObject(
    keyAdjuntoEjemplo,
    Buffer.from("Documento de ejemplo generado por el seed.\n"),
    "text/plain",
  );
  console.log("✔ Adjunto de ejemplo subido al bucket.");

  // --- Registros ------------------------------------------------------------
  const registros = db.collection<Registro>("registros");

  const registrosSeed: Array<Omit<Registro, "_id">> = [
    {
      usuarioId: idsPorEmail.get(administradoEmail)!,
      usuarioEmail: administradoEmail,
      interesado: {
        nombre: "Ana García Ruiz",
        nif: "00000001A",
        direccionFiscal: "Calle Mayor 1, 28001 Madrid",
      },
      representante: null,
      expone: "Que ha detectado una farola averiada frente a su domicilio.",
      solicita: "Que se proceda a la reparación del alumbrado público en dicha ubicación.",
      adjuntos: [
        { key: keyAdjuntoEjemplo, nombreOriginal: "dni-ejemplo.txt", tipo: "text/plain", tamano: 45 },
      ],
      estado: "presentado",
      creadoEn: new Date("2026-01-10T09:00:00.000Z"),
    },
    {
      usuarioId: idsPorEmail.get(administradoEmail2)!,
      usuarioEmail: administradoEmail2,
      interesado: {
        nombre: "María López Sánchez",
        nif: "00000002B",
        direccionFiscal: "Avenida de la Constitución 22, 41001 Sevilla",
      },
      representante: {
        nombre: "Despacho Jurídico Sánchez y Asociados",
        nif: "B00000003",
        direccionFiscal: "Calle Sierpes 10, 41001 Sevilla",
      },
      expone: "Que desea solicitar una licencia de obra menor para reforma de fachada.",
      solicita: "Que se conceda la licencia de obra menor correspondiente.",
      adjuntos: [],
      estado: "presentado",
      creadoEn: new Date("2026-01-12T11:30:00.000Z"),
    },
    {
      usuarioId: idsPorEmail.get(administradoEmail3)!,
      usuarioEmail: administradoEmail3,
      interesado: {
        nombre: "Juan Pérez Martín",
        nif: "00000004C",
        direccionFiscal: "Plaza España 5, 46002 Valencia",
      },
      representante: null,
      expone: "Que ha presentado en plazo su declaración de la tasa municipal.",
      solicita: "Que se le expida certificado acreditativo de estar al corriente de pago.",
      adjuntos: [],
      estado: "presentado",
      creadoEn: new Date("2026-01-15T16:45:00.000Z"),
    },
    {
      usuarioId: idsPorEmail.get(administradoEmail)!,
      usuarioEmail: administradoEmail,
      interesado: {
        nombre: "Ana García Ruiz",
        nif: "00000001A",
        direccionFiscal: "Calle Mayor 1, 28001 Madrid",
      },
      representante: null,
      expone: "Que solicita información sobre ayudas a la rehabilitación de vivienda.",
      solicita: "Que se le remita la convocatoria vigente de ayudas.",
      adjuntos: [],
      estado: "presentado",
      creadoEn: new Date("2026-01-18T10:15:00.000Z"),
    },
  ];

  const idsRegistros: ObjectId[] = [];
  for (const registro of registrosSeed) {
    const resultado = await registros.findOneAndUpdate(
      { "interesado.nif": registro.interesado.nif, expone: registro.expone },
      { $setOnInsert: registro },
      { upsert: true, returnDocument: "after" },
    );
    if (resultado) idsRegistros.push(resultado._id);
  }
  console.log(`✔ ${registrosSeed.length} registros asegurados.`);

  // --- Expedientes ------------------------------------------------------------
  const expedientes = db.collection<Expediente>("expedientes");

  const expedientesSeed: Array<Omit<Expediente, "_id">> = [
    {
      codigo: "EXP-2026-000001",
      registroId: idsRegistros[0],
      sujeto: {
        usuarioId: idsPorEmail.get(administradoEmail)!,
        nombre: "Ana García Ruiz",
        email: administradoEmail,
      },
      tipo: "general",
      estado: "abierto",
      actuaciones: [
        {
          fecha: new Date("2026-01-11T09:00:00.000Z"),
          texto: "Expediente incoado a partir del registro de entrada.",
          autorEmail: funcionarioEmail,
        },
        {
          fecha: new Date("2026-01-13T12:00:00.000Z"),
          texto: "Se traslada la incidencia al servicio de mantenimiento de alumbrado.",
          autorEmail: funcionarioEmail,
        },
      ],
      creadoEn: new Date("2026-01-11T09:00:00.000Z"),
      cerradoEn: null,
    },
    {
      codigo: "EXP-2026-000002",
      registroId: idsRegistros[1],
      sujeto: {
        usuarioId: idsPorEmail.get(administradoEmail2)!,
        nombre: "María López Sánchez",
        email: administradoEmail2,
      },
      tipo: "urbanismo",
      estado: "cerrado",
      actuaciones: [
        {
          fecha: new Date("2026-01-13T09:00:00.000Z"),
          texto: "Expediente incoado a partir del registro de entrada.",
          autorEmail: funcionarioEmail,
        },
        {
          fecha: new Date("2026-01-14T10:00:00.000Z"),
          texto: "Se solicita informe técnico al servicio de urbanismo.",
          autorEmail: funcionarioEmail,
        },
        {
          fecha: new Date("2026-01-20T09:00:00.000Z"),
          texto: `Expediente cerrado por ${funcionarioEmail}.`,
          autorEmail: funcionarioEmail,
        },
      ],
      creadoEn: new Date("2026-01-13T09:00:00.000Z"),
      cerradoEn: new Date("2026-01-20T09:00:00.000Z"),
    },
  ];

  for (const expediente of expedientesSeed) {
    await expedientes.findOneAndUpdate(
      { codigo: expediente.codigo },
      { $setOnInsert: expediente },
      { upsert: true },
    );
  }
  console.log(`✔ ${expedientesSeed.length} expedientes asegurados.`);

  // --- Configuración de la home ------------------------------------------
  const config = db.collection<ConfigHome>("config");
  await config.updateOne(
    { _id: CONFIG_DOC_ID },
    { $setOnInsert: { _id: CONFIG_DOC_ID, ...DEFAULT_CONFIG, actualizadoEn: new Date() } },
    { upsert: true },
  );
  console.log("✔ Configuración de la home asegurada.");

  console.log("Seed completado.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Error ejecutando el seed:", error);
  process.exit(1);
});
