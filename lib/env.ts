import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  APP_SESSION_SECRET: z.string().min(16, "APP_SESSION_SECRET debe tener al menos 16 caracteres"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI es obligatoria"),

  STORAGE_PROVIDER: z.enum(["local", "r2"]).default("local"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((value) => value === "true"),

  EMAIL_PROVIDER: z.enum(["smtp", "resend"]).default("smtp"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined)),
  EMAIL_FROM: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),

  SEED_FUNCIONARIO_EMAIL: z.string().email().optional(),
  SEED_ADMINISTRADO_EMAIL: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas o faltantes:\n${issues}\n\nRevisa tu .env.local contra .env.example.`,
    );
  }

  if (parsed.data.EMAIL_PROVIDER === "smtp" && (!parsed.data.SMTP_HOST || !parsed.data.SMTP_PORT)) {
    throw new Error("EMAIL_PROVIDER=smtp requiere SMTP_HOST y SMTP_PORT.");
  }

  if (parsed.data.EMAIL_PROVIDER === "resend" && !parsed.data.RESEND_API_KEY) {
    throw new Error("EMAIL_PROVIDER=resend requiere RESEND_API_KEY.");
  }

  return parsed.data;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
