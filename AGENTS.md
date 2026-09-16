# AGENTS.md — Sede Electrónica: Registro General

## Resumen

Sede electrónica al estilo de la administración pública española. El **administrado**
(ciudadano) presenta instancias generales con adjuntos; el **funcionario** ve todos
los registros, abre un **expediente** a partir de uno de ellos y le añade
**actuaciones** a lo largo de su tramitación. Incluye un modo "SaaS" mínimo: el
funcionario edita los textos de la home pública desde un panel de configuración.
El rol siempre se resuelve y se verifica en el servidor, nunca solo en el cliente.

## Stack técnico

- **Next.js 16.3.5** (App Router, Turbopack) + **React 19.2** + **TypeScript 5** estricto.
- **Tailwind CSS v4** (config vía `@theme` en `app/globals.css`, sin `tailwind.config.js`).
- **MongoDB** — driver nativo `mongodb@7` (sin ODM), singleton en `lib/db.ts`.
- **Storage S3-compatible** — `@aws-sdk/client-s3` + `s3-request-presigner`. Local: RustFS. Producción: Cloudflare R2.
- **Email** — `nodemailer` (SMTP/MailHog en local) o `resend` (producción), detrás de un único adaptador (`lib/mailer.ts`).
- **Auth** — magic link sin contraseña; sesión en cookie httpOnly firmada con `jose` (JWT HS256).
- **Validación** — `zod` (env vars y bodies de API).
- **Testing E2E** — `@playwright/test`.

## Comandos esenciales

```bash
npm install
docker compose up -d              # Mongo + MailHog + RustFS
cp .env.example .env.local        # rellenar valores locales
npm run seed                      # datos de ejemplo, idempotente
npm run dev                       # http://localhost:3000

npm run build                     # build de producción
npm run lint                      # eslint
npm run typecheck                 # tsc --noEmit

cp .env.example .env.test         # y cambiar MONGODB_URI a otra BD (…-test)
npm run seed:test
npm run test:e2e                  # Playwright headless (levanta build+start solo)
npm run test:e2e:ui               # modo UI para depurar
```

MailHog UI: http://localhost:8025 · Consola RustFS: http://localhost:9001 (credenciales `rustfsadmin` / `rustfsadmin`).

> Nota de entorno: si ya tienes un `mongod` nativo escuchando en `localhost:27017`,
> este tomará precedencia sobre el contenedor Docker para conexiones a `localhost`
> (el binding específico gana sobre el wildcard `0.0.0.0` del proxy de Docker en
> macOS). Funciona igual para la app, pero si quieres usar explícitamente el Mongo
> de Docker, cambia el puerto publicado en `docker-compose.yml` y `MONGODB_URI`.

## Estructura de carpetas

```
app/
  (publico)/          Home pública y login (sin prefijo de URL: route group)
  administrado/        Presentar instancia, "mis presentaciones" (carpeta real, no route group)
  funcionario/          Registros, expedientes, configuración de la home (carpeta real)
  api/
    auth/               request-link, verify, logout, test-login (solo NODE_ENV=test)
    registros/           CRUD de instancias + presign de adjuntos + descarga
    expedientes/          Creación de expedientes y sus actuaciones embebidas
    config/               Lectura pública / edición (funcionario) de los textos de la home
lib/
  env.ts                Validación de variables de entorno con zod (falla rápido si faltan)
  db.ts                 Singleton de MongoClient + índices + helpers de colección tipados
  types.ts               Tipos de dominio (Usuario, Registro, Expediente, Actuacion, ConfigHome…)
  auth.ts                 Magic link (emisión/verificación) + cookie de sesión (JWT)
  rbac.ts                  requireSession/requireRole + wrapper de errores para API routes
  storage.ts                Adaptador S3 (RustFS/R2): presign, ensureBucket + CORS, keys
  mailer.ts                  Adaptador de email (SMTP/Resend) tras una única interfaz
  config.ts                   Lectura de la config de la home + valores por defecto
  client/subirAdjunto.ts       Subida directa a S3 desde el navegador con progreso (XHR)
context/GlobalContext.tsx  Usuario/rol en cliente, hidratado desde la sesión del servidor
components/                  Cabecera, formularios y piezas de UI compartidas
proxy.ts                      Lógica de autorización por rol (ver sección siguiente)
scripts/seed.ts                Datos de ejemplo idempotentes
tests/e2e/                      Suites Playwright + helpers (magic link vía MailHog)
docker-compose.yml                Mongo, MailHog, RustFS (solo local)
```

## Decisiones de nomenclatura y desviaciones deliberadas del enunciado

- **`proxy.ts`, no `middleware.ts`.** Next.js 16 **renombró y deprecó** la
  convención `middleware.ts` en favor de `proxy.ts` (mismo propósito: código de
  servidor que corre antes de renderizar, matcher por rutas). El propio
  framework rechaza el build si detecta ambos ficheros. Por eso solo existe
  `proxy.ts` en la raíz, exportando la función `proxy` y `config.matcher`.
- **`administrado/` y `funcionario/` son carpetas reales, no route groups.**
  El enunciado original las mostraba como `(administrado)/` y `(funcionario)/`
  (paréntesis = *route group*, no añade segmento a la URL). Pero la
  autorización por rol en `proxy.ts` necesita un **prefijo de URL real**
  (`/administrado/*`, `/funcionario/*`) para poder proteger esas rutas con un
  `matcher`. Se optó por la interpretación más simple y funcional: carpetas
  normales. `(publico)/` sí se mantuvo como route group (home y login viven en
  la raíz de la URL).
- **`/api/config`**: `GET` es público (lo lee la home en cada render, sin
  caché — `export const dynamic = "force-dynamic"`); solo `PUT` exige rol
  `funcionario`. `proxy.ts` distingue por método HTTP en ese caso concreto.
- El administrado **no** puede ver el estado/actuaciones de su propio
  expediente — no estaba en el alcance original (ver sección 3 del prompt).
  Quedaría como extensión natural: añadir un `GET /api/expedientes` filtrado
  por `sujeto.usuarioId` cuando el rol sea `administrado`.

## Reglas de negocio no obvias

1. **El rol define la vista y se verifica siempre en servidor.** `proxy.ts`
   protege páginas y API routes por prefijo/rol; además cada API route vuelve
   a comprobar con `requireSession()`/`requireRole()` de `lib/rbac.ts` (defensa
   en profundidad — nunca confíes solo en el middleware).
2. **Expediente nace de un registro.** Se crea vía `POST /api/expedientes`
   con un `registroId` existente; copia `sujeto` (nombre/email/usuarioId) del
   registro en el momento de creación (no se recalcula después aunque el
   registro cambie).
3. **Actuaciones van embebidas** en `expediente.actuaciones[]` (no en una
   colección aparte) — es una decisión de modelado intencional: siempre se
   leen junto al expediente y no crecen sin límite razonable.
3b. **Expediente tiene `estado: "abierto" | "cerrado"`.** Nace `abierto`.
   Solo el funcionario puede cerrarlo (`POST /api/expedientes/:id/cerrar`),
   lo que añade automáticamente una actuación de cierre y fija `cerradoEn`.
   Un expediente **cerrado no admite nuevas actuaciones**
   (`POST .../actuaciones` responde 409) — no hay endpoint de reapertura,
   es deliberado (no estaba en el alcance pedido). El listado
   `GET /api/expedientes` acepta `?estado=abierto|cerrado` para filtrar; sin
   parámetro devuelve todos (el filtro por defecto a "abiertos" vive en la
   página `app/funcionario/expedientes/page.tsx`, con pestañas
   Abiertos/Cerrados/Todos). El filtro de "abiertos" usa `estado: { $ne:
   "cerrado" }` (no `estado: "abierto"`) para tratar como abiertos los
   documentos legacy sin el campo.
4. **Adjuntos**: el registro solo guarda `key` (+ metadatos); nunca una URL
   firmada. Las URLs se generan al vuelo y expiran pronto (15 min subida, 5
   min descarga). La subida es **directa del navegador a S3** vía PUT
   prefirmado (`lib/client/subirAdjunto.ts`) — el servidor nunca ve los bytes.
   Esto exige **CORS en el bucket** (`ensureBucket()` en `lib/storage.ts` lo
   configura automáticamente); sin esa configuración, la subida falla en
   cualquier navegador real con "Error de red" aunque funcione por `curl`.
5. **Magic link de un solo uso**: se persiste solo el hash SHA-256 del token
   en `magicLinks` (TTL index sobre `expiraEn`); `verifyMagicLinkToken` marca
   el uso de forma atómica (`findOneAndUpdate`) para evitar doble canje por
   condiciones de carrera.
6. **Rol de un usuario nuevo**: siempre `administrado` por defecto. Un email
   se vuelve `funcionario` solo si su documento en `usuarios` ya tiene ese rol
   (normalmente sembrado por `scripts/seed.ts` vía `SEED_FUNCIONARIO_EMAIL`).
   No hay una UI para "ascender" a funcionario — es deliberado.
7. **`_id` se genera en la aplicación** (`new ObjectId()`) antes de
   `insertOne`, no se confía en el retorno de Mongo. Motivo: en `mongodb@7`,
   `OptionalUnlessRequiredId<T>` deja de hacer `_id` opcional si el tipo del
   esquema lo declara requerido (que es el caso de nuestros tipos de dominio,
   pensados para representar también los documentos ya leídos). Generar el
   id en la app evita ese conflicto de tipos y de paso lo deja disponible
   inmediatamente para la respuesta HTTP.

## Convenciones de código

- **Naming**: identificadores y textos de UI en español (dominio de negocio
  español); nombres de tipos/funciones en `camelCase`/`PascalCase` estándar de
  TS. Sin `any` salvo justificación explícita (no hay ninguno en el código
  actual).
- **Errores en API routes**: usar `withApiErrorHandling(async () => {...})`
  de `lib/rbac.ts`, que traduce `AuthError` a 401/403 y cualquier otro error a
  500 con log en servidor. Los datos de entrada siempre se validan con `zod`
  antes de tocar la base de datos.
- **Nuevas variables de entorno**: añadirlas primero a `lib/env.ts` (schema
  zod) y después a `.env.example` (con comentario y valor de ejemplo, nunca
  un secreto real). La app falla rápido y con un mensaje claro si falta algo.
- **Server vs. client components**: por defecto server component; usar
  `"use client"` solo donde hay estado/interactividad (formularios, botones
  con `fetch`). Las páginas que leen la base de datos usan
  `export const dynamic = "force-dynamic"` para evitar caché agresiva de RSC.

## Tests E2E (Playwright)

- Viven en `tests/e2e/`. `playwright.config.ts` levanta `npm run build && npm
  run start` contra `http://localhost:3000` (o `E2E_BASE_URL` si se apunta a
  un entorno ya desplegado, ver Bloque B) con `NODE_ENV=test`.
- **Autenticación en tests**: estrategia (a) del prompt — se pide el magic
  link por la UI/API real y se captura desde la **API de MailHog**
  (`tests/e2e/helpers/mailhog.ts` → `esperarEnlaceMagico`), navegando después
  a ese enlace real. Existe además `POST /api/auth/test-login`
  (`app/api/auth/test-login/route.ts`) como *fallback* explícito, activo solo
  si `NODE_ENV=test`, pero la suite actual no lo necesita.
- **Datos de test**: base de datos separada. Crea `.env.test` (a partir de
  `.env.example`, cambiando `MONGODB_URI` a algo como
  `.../sede-electronica-test`) y siembra con `npm run seed:test` antes de
  correr `npm run test:e2e`. El seed es idempotente, pero los propios tests
  crean datos nuevos con sufijos únicos (`Date.now()`) para no chocar con
  ejecuciones previas.
- **Añadir un test nuevo**: crea `tests/e2e/mi-caso.spec.ts`, reutiliza
  `loginConMagicLink(page, email)` de `tests/e2e/helpers/auth.ts` para
  autenticarte, y los emails de `tests/e2e/helpers/fixtures.ts`.

## Estado de producción

Bloque A (local) completo y verificado (build, lint, typecheck, seed
idempotente, RBAC manual y automatizado, suite E2E en verde de forma
reproducible). El **Bloque B** (producción) requiere acciones sobre cuentas
cloud reales del usuario (MongoDB Atlas, Cloudflare R2/DNS, Resend, Vercel)
que este agente no puede ejecutar sin acceso a esas cuentas — ver el propio
`PROMT.md` para el plan fase a fase. Lo que sí es responsabilidad del código y
ya está resuelto:

- `lib/storage.ts` es agnóstico RustFS/R2 (mismas variables `S3_*`, solo
  cambia `STORAGE_PROVIDER`, endpoint y credenciales).
- `lib/mailer.ts` soporta ambos backends (`EMAIL_PROVIDER=smtp|resend`) tras
  la misma interfaz `sendMagicLinkEmail(to, link)`.
- Cookies de sesión ya son `Secure` cuando `NODE_ENV=production`
  (`lib/auth.ts`).
- `.gitlab-ci.yml` en la raíz implementa el pipeline de calidad (lint →
  typecheck → build → E2E) descrito en la Fase B3, pensado como puerta antes
  del mirror GitLab→GitHub→Vercel (no sustituye el despliegue de Vercel).

Pendiente y fuera del alcance de este agente: aprovisionar los servicios
cloud (Fase B0), configurar variables de entorno reales en Vercel (B2),
activar el dominio `registro.jpavon-tech.com` en Cloudflare/Vercel (B4),
smoke test post-despliegue (B5) y, solo entonces, actualizar `README.md` con
la URL pública (B6).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
