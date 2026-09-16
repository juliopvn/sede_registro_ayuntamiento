import { MongoClient, type Db } from "mongodb";
import { getEnv } from "@/lib/env";
import type {
  Actuacion,
  ConfigHome,
  Expediente,
  MagicLink,
  Registro,
  Usuario,
} from "@/lib/types";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(getEnv().MONGODB_URI);
  return client.connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (getEnv().NODE_ENV === "development") {
    // Reutiliza el cliente en `global` en desarrollo para evitar agotar
    // conexiones por el hot-reload de Next.js.
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }

  return createClientPromise();
}

let indexesEnsured = false;

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;

  await Promise.all([
    db.collection<Usuario>("usuarios").createIndex({ email: 1 }, { unique: true }),
    db
      .collection<MagicLink>("magicLinks")
      .createIndex({ tokenHash: 1 }, { unique: true }),
    db
      .collection<MagicLink>("magicLinks")
      .createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0 }),
    db.collection<Registro>("registros").createIndex({ usuarioId: 1 }),
    db.collection<Registro>("registros").createIndex({ creadoEn: -1 }),
    db
      .collection<Expediente>("expedientes")
      .createIndex({ codigo: 1 }, { unique: true }),
    db.collection<Expediente>("expedientes").createIndex({ registroId: 1 }),
  ]);

  indexesEnsured = true;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db();
  await ensureIndexes(db);
  return db;
}

export async function usuariosCollection() {
  return (await getDb()).collection<Usuario>("usuarios");
}

export async function magicLinksCollection() {
  return (await getDb()).collection<MagicLink>("magicLinks");
}

export async function registrosCollection() {
  return (await getDb()).collection<Registro>("registros");
}

export async function expedientesCollection() {
  return (await getDb()).collection<Expediente>("expedientes");
}

export async function configCollection() {
  return (await getDb()).collection<ConfigHome>("config");
}

export type { Actuacion };
