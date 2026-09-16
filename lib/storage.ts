import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { getEnv } from "@/lib/env";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

let client: S3Client | undefined;
let bucketEnsured = false;

function getClient(): S3Client {
  if (!client) {
    const env = getEnv();
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/**
 * Crea el bucket si no existe todavía y asegura una política CORS que
 * permite la subida/descarga directa desde el navegador (URLs prefirmadas).
 * Idempotente; necesario tanto en RustFS (local) como en R2 (producción).
 */
export async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;

  const env = getEnv();
  const s3 = getClient();

  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET_NAME }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET_NAME }));
  }

  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: env.S3_BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: [env.NEXT_PUBLIC_APP_URL],
              AllowedMethods: ["GET", "PUT", "HEAD"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
  } catch (error) {
    // No todos los proveedores S3 exponen PutBucketCors (o puede requerir
    // configurarse fuera de banda, p. ej. en R2). No bloqueamos el arranque.
    console.warn("No se ha podido configurar CORS en el bucket:", error);
  }

  bucketEnsured = true;
}

/** Genera una key única y estable para un adjunto de un registro. */
export function buildAttachmentKey(registroId: string, nombreOriginal: string): string {
  const extension = nombreOriginal.includes(".") ? nombreOriginal.split(".").pop() : undefined;
  const base = `registros/${registroId}/${randomUUID()}`;
  return extension ? `${base}.${extension}` : base;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await ensureBucket();
  const env = getEnv();
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** URL prefirmada de subida directa desde el cliente (PUT). */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  await ensureBucket();
  const env = getEnv();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

/** URL prefirmada de descarga (GET), de expiración corta. */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const env = getEnv();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(getClient(), command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}
