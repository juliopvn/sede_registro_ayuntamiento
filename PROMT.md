# Prompt de implementación — Sede Electrónica: Registro General de la Administración



---

## 0. Rol y reglas de trabajo para el agente

Eres un agente de ingeniería de software full-stack. Vas a construir una **sede electrónica** al estilo de la administración pública española: el ciudadano (**administrado**) presenta instancias generales, y el **funcionario** las tramita creando expedientes con actuaciones.

Reglas generales:

1. Trabaja **fase por fase, en el orden indicado**. No empieces una fase sin haber verificado (build, lint, y donde aplique, tests) que la fase anterior funciona.
2. Al terminar cada fase, haz un commit atómico con un mensaje claro (`feat(fase-A3): capa de datos y conexión Mongo`).
3. No inventes funcionalidades fuera de lo descrito aquí. Si algo es ambiguo, señálalo explícitamente en el commit o en un comentario `// TODO(decisión pendiente): ...` y continúa con la interpretación más simple.
4. Todo el código en TypeScript estricto. Nada de `any` salvo justificación explícita.
5. La comprobación de rol/autorización se hace **siempre en servidor** (API routes + `proxy.ts`), nunca solo en cliente.
6. No crear `README.md` — ya existe uno en el repo. Solo se actualizará al final del Bloque Producción (fase B6) para añadir la URL pública.
7. No se crean secretos ni credenciales reales en el código ni en `.env.example` — solo nombres de variables con valores de ejemplo/placeholder.

---

## 1. Resumen del sistema

### 1.1 Arquitectura

```
Next.js (administrado / funcionario)
        │
        ▼
   API Routes: registros, expedientes, actuaciones, auth, config
        │              │                    │
        ▼              ▼                    ▼
     MongoDB      S3 (adjuntos)         Email (magic link)
```

- **Frontend**: Next.js 16 + TypeScript + Tailwind. `GlobalContext` guarda usuario y rol.
- **Base de datos**: MongoDB, driver nativo (singleton en `lib/db.ts`).
- **Storage**: S3-compatible, presigned URLs, bucket autocreado si no existe.
- **Email**: magic link para autenticación sin contraseña.
- **Protección de rutas**: middleware (`proxy.ts`) que valida sesión/rol en servidor.

En **local** los servicios de storage y email se resuelven con **RustFS** (S3 vía Docker) y **MailHog**. En **producción** se resuelven con **Cloudflare R2** y **Resend** respectivamente (ver Bloque B). El código de negocio debe ser agnóstico a cuál de los dos está detrás — ver Fase A3/A8 y Fase B1 (adaptadores).

### 1.2 Modelo de dominio

```
Instancia General (Registro)
 ├─ interesado (nombre, dirección fiscal)
 ├─ representante (opcional)
 ├─ expone (texto) / solicita (texto)
 └─ ficheros adjuntos (S3)

Expediente
 ├─ código único + fecha de creación
 ├─ contribuyente/sujeto (ref. al administrado)
 ├─ tipo de expediente
 └─ actuaciones[] { fecha, texto }
```

### 1.3 Funcionalidades por rol

- **Administrado**: autenticarse con magic link, presentar instancia general con adjuntos, consultar sus presentaciones previas (filtradas por su propio usuario).
- **Funcionario**: ver los registros de **todos** los administrados (sin filtro), crear un expediente a partir de un registro, añadir actuaciones al expediente, personalizar los datos de la home (modo SaaS).

### 1.4 Principios de solución

1. **El rol define la vista**: administrado ve solo lo suyo; funcionario ve todo y tiene acciones de tramitación. Verificación siempre en servidor.
2. **Registro → Expediente**: el expediente nace a partir de un registro (decisión del funcionario), guardando la referencia (`registroId`). Las actuaciones se embeben como array dentro del expediente (no se referencian en colección aparte).
3. **Adjuntos a S3**: los ficheros de la instancia van al bucket S3 y el registro guarda solo las claves (keys); la descarga usa URLs prefirmadas con expiración corta.
4. **Personalización SaaS**: una colección `config` almacena los textos/datos editables de la home; el funcionario los edita, la home los lee en cada render (sin caché agresiva, o con revalidación corta).

### 1.5 Estructura de proyecto propuesta

```
/
├── app/                        # Next.js App Router
│   ├── (publico)/              # home, login
│   ├── (administrado)/         # presentar instancia, mis registros
│   ├── (funcionario)/          # registros, expedientes, config home
│   └── api/
│       ├── auth/               # magic link (request + verify)
│       ├── registros/
│       ├── expedientes/
│       ├── actuaciones/
│       └── config/
├── lib/
│   ├── db.ts                   # singleton MongoDB
│   ├── storage.ts               # adaptador S3 (RustFS/R2)
│   ├── mailer.ts                 # adaptador email (SMTP/Resend)
│   ├── auth.ts                  # emisión/verificación de tokens de sesión
│   └── rbac.ts                   # helpers de autorización por rol
├── middleware.ts / proxy.ts     # protección de rutas
├── context/GlobalContext.tsx
├── scripts/
│   └── seed.ts
├── tests/
│   └── e2e/                     # Playwright
├── docker-compose.yml           # mongo, mailhog, rustfs (solo local)
├── .env.example
├── AGENTS.md
├── playwright.config.ts
└── README.md                    # ya existe, no crear — solo actualizar en fase B6
```

---

## BLOQUE A — LOCAL (el sistema debe funcionar al 100% en local antes de tocar producción)

### Fase A0 — Bootstrap del repo y estructura
- Inicializar/confirmar proyecto Next.js 16 + TypeScript + Tailwind.
- Crear la estructura de carpetas de la sección 1.5.
- Configurar ESLint + Prettier + `tsconfig.json` estricto.
- **Verificación**: `npm run build` pasa sin errores sobre el esqueleto vacío.

### Fase A1 — Infraestructura local con Docker Compose
- Crear `docker-compose.yml` con tres servicios: `mongo` (con volumen persistente), `mailhog` (puertos 1025/8025), `rustfs` (S3 local, puerto 9000/9001, credenciales de ejemplo `rustfsadmin`).
- Documentar en `AGENTS.md` (fase A13) cómo levantarlo (`docker compose up -d`).
- **Verificación**: los tres contenedores levantan y son accesibles (Mongo en su puerto, MailHog UI en `:8025`, consola RustFS en `:9001`).

### Fase A2 — Variables de entorno: `.env.example`
Crear `.env.example` con **todas** las variables necesarias, agrupadas y comentadas, sin valores reales. Mínimo:

```dotenv
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_SESSION_SECRET=changeme-generate-a-long-random-string

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sede-electronica

# Storage (S3-compatible) — local: RustFS, prod: Cloudflare R2
STORAGE_PROVIDER=local            # local | r2
S3_ENDPOINT=http://localhost:9000
S3_REGION=auto
S3_ACCESS_KEY_ID=rustfsadmin
S3_SECRET_ACCESS_KEY=changeme
S3_BUCKET_NAME=sede-electronica-adjuntos
S3_FORCE_PATH_STYLE=true

# Email (magic link) — local: MailHog (SMTP), prod: Resend (API)
EMAIL_PROVIDER=smtp               # smtp | resend
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM="Sede Electrónica <no-reply@localhost>"
RESEND_API_KEY=

# Seeds
SEED_FUNCIONARIO_EMAIL=funcionario@example.com
SEED_ADMINISTRADO_EMAIL=administrado@example.com
```

- **Verificación**: `cp .env.example .env.local` + rellenar valores locales arranca la app sin errores de variables faltantes (usar validación con zod/env-safe en `lib/env.ts`).

### Fase A3 — Capa de datos y conexión Mongo
- `lib/db.ts`: singleton de conexión con el driver nativo de MongoDB (patrón recomendado para Next.js: reutilizar cliente en `global` en desarrollo).
- Definir tipos TypeScript para `Registro`, `Expediente`, `Actuacion`, `Usuario`, `ConfigHome`.
- Definir índices necesarios (p. ej. `registros.usuarioId`, `expedientes.registroId`, `expedientes.codigo` único).
- **Verificación**: script simple que conecta, hace ping y cierra conexión.

### Fase A4 — Autenticación (magic link) + `GlobalContext` + `proxy.ts`
- `POST /api/auth/request-link`: recibe email, genera token firmado de un solo uso con expiración corta, envía email vía `lib/mailer.ts` (adaptador SMTP en local → MailHog).
- `GET /api/auth/verify?token=...`: valida token, crea sesión (cookie httpOnly firmada), determina rol (`administrado` por defecto; `funcionario` si el email está en una lista/colección de funcionarios).
- `GlobalContext`: expone `usuario` y `rol` al árbol de componentes, hidratado desde la sesión.
- `proxy.ts` (middleware): protege rutas `/funcionario/*` y las API routes de escritura de expedientes/actuaciones/config exigiendo rol `funcionario`; protege rutas de administrado exigiendo sesión válida.
- **Verificación**: flujo completo de login probado manualmente vía MailHog (`localhost:8025`).

### Fase A5 — API routes: registros
- `POST /api/registros`: crea instancia general (interesado, representante opcional, expone/solicita, adjuntos). Solo administrado autenticado; el `usuarioId` se toma de la sesión, nunca del body.
- `GET /api/registros`: administrado recibe solo los suyos (filtrado por `usuarioId` de sesión); funcionario recibe todos, sin filtro, con paginación.
- **Verificación**: pruebas manuales/curl para ambos roles confirman el filtrado correcto.

### Fase A6 — API routes: expedientes y actuaciones
- `POST /api/expedientes`: solo funcionario. Crea expediente a partir de un `registroId` existente (código único autogenerado, fecha de creación, tipo de expediente, `sujeto` copiado/referenciado del registro).
- `POST /api/expedientes/:id/actuaciones`: solo funcionario. Añade `{ fecha, texto }` al array embebido `actuaciones` del expediente.
- `GET /api/expedientes` / `GET /api/expedientes/:id`: funcionario ve todos; considerar si el administrado puede ver el estado de su propio expediente (si no está en el alcance original, dejarlo fuera y anotarlo como posible extensión).
- **Verificación**: creación de expediente desde un registro real, añadido de 2+ actuaciones, lectura correcta del array embebido.

### Fase A7 — API routes: configuración (modo SaaS)
- Colección `config` con un documento único (o por tenant, si se prevé multi-tenant a futuro) con los textos/datos editables de la home.
- `GET /api/config`: público, usado por la home en cada render.
- `PUT /api/config`: solo funcionario.
- **Verificación**: cambio de un texto desde el panel de funcionario se refleja en la home tras refrescar.

### Fase A8 — Adjuntos a S3 (RustFS)
- `lib/storage.ts`: adaptador con interfaz común (`putObject`, `getPresignedUploadUrl`, `getPresignedDownloadUrl`, `ensureBucket`) usando el SDK de AWS S3 v3, configurado por `S3_ENDPOINT`/credenciales del `.env` (compatible tanto con RustFS como con R2 sin cambiar código, solo variables).
- Auto-creación del bucket si no existe al arrancar (local).
- El registro guarda únicamente las **keys** de S3, nunca URLs firmadas persistidas (se generan al vuelo).
- **Verificación**: subida de un adjunto real desde el formulario de instancia, descarga vía URL prefirmada funcionando y expirando correctamente.

### Fase A9 — Frontend: Administrado
- Página de login (solicitar magic link) + pantalla "revisa tu correo".
- Formulario de instancia general (interesado, representante opcional, expone/solicita, subida de adjuntos con progreso).
- Listado de "mis presentaciones" con estado/fecha.
- **Verificación**: flujo E2E manual — login → presentar instancia con adjunto → verla en el listado.

### Fase A10 — Frontend: Funcionario
- Listado de todos los registros (todos los administrados), con búsqueda/paginación.
- Acción "crear expediente" desde un registro.
- Vista de expediente con línea de tiempo de actuaciones y formulario para añadir una nueva.
- Panel de configuración de la home (modo SaaS).
- **Verificación**: flujo E2E manual — login como funcionario → ver registro de otro usuario → crear expediente → añadir actuación → editar home.

### Fase A11 — Seeds de datos (`scripts/seed.ts`)
El seed debe ser **idempotente** (se puede correr varias veces sin duplicar) y debe crear:
- 1 usuario **funcionario** (email desde `SEED_FUNCIONARIO_EMAIL`).
- 2–3 usuarios **administrado** (uno desde `SEED_ADMINISTRADO_EMAIL`, otros de ejemplo).
- 3–5 **registros** de ejemplo con distintos interesados, con y sin representante, con al menos un adjunto simulado (subido al bucket local de prueba).
- 1–2 **expedientes** ya creados a partir de algunos de esos registros, con 2+ actuaciones cada uno, para poder probar la vista de funcionario sin pasos manuales.
- 1 documento de **config** con los textos por defecto de la home.
- Comando: `npx tsx scripts/seed.ts` (ya referenciado en el flujo de arranque).
- **Verificación**: correr el seed dos veces seguidas no genera duplicados ni errores.

### Fase A12 — Testing E2E local (Playwright)
- Instalar y configurar Playwright (`playwright.config.ts`) apuntando a `http://localhost:3000`, con `webServer` que levante `npm run dev` (o `npm run build && npm run start`) automáticamente antes de correr los tests.
- Estrategia de datos: los tests E2E corren contra una base de datos de test separada (`MONGODB_URI` distinta, p. ej. `sede-electronica-test`) sembrada con `scripts/seed.ts` antes de la suite, y opcionalmente limpiada después.
- Autenticación en tests: dado que el login es por magic link (correo), dos estrategias posibles a implementar — (a) leer el link generado desde la API de MailHog (`http://localhost:8025/api/v2/messages`) y navegar a él, o (b) exponer un endpoint de test-only (`/api/auth/test-login`, habilitado solo si `NODE_ENV=test`) que crea sesión directamente. Se recomienda **(a)** por fidelidad al flujo real; usar (b) solo como fallback si (a) es inestable.
- **Suites mínimas a implementar**:
  1. `auth.spec.ts`: solicitar magic link, capturarlo desde MailHog, verificar login exitoso y redirección según rol.
  2. `administrado-presentar-instancia.spec.ts`: login como administrado → completar formulario → subir adjunto → confirmar aparición en "mis presentaciones".
  3. `funcionario-tramitar.spec.ts`: login como funcionario → ver registro de otro usuario → crear expediente → añadir actuación → verificar en la línea de tiempo.
  4. `funcionario-config-home.spec.ts`: login como funcionario → editar textos de la home → verificar reflejo en la home pública.
  5. `rbac.spec.ts`: un administrado no puede acceder a rutas/API de funcionario (403/redirect), y solo ve sus propios registros aunque intente forzar la URL/API de otro usuario.
- Scripts en `package.json`: `test:e2e` (headless) y `test:e2e:ui` (modo UI de Playwright para debugging).
- **Verificación**: `npm run test:e2e` pasa en verde de forma reproducible con `docker compose up -d` + seed ya corridos.

### Fase A13 — `AGENTS.md`
Crear `AGENTS.md` en la raíz, pensado para que cualquier agente de IA que trabaje después en el repo tenga contexto inmediato. Debe incluir:
- Resumen de 3–5 líneas del proyecto y su dominio (registro general / expedientes).
- Stack técnico exacto (versiones de Next.js, TypeScript, Tailwind, MongoDB driver, Playwright).
- Comandos esenciales: `npm install`, levantar Docker, `npx tsx scripts/seed.ts`, `npm run dev`, `npm run test:e2e`, `npm run build`.
- Estructura de carpetas (la de la sección 1.5) con una línea por carpeta explicando su responsabilidad.
- Reglas de negocio no obvias: rol define la vista, expediente nace de un registro, actuaciones embebidas (no colección aparte), adjuntos solo por key+URL prefirmada, verificación de rol siempre en servidor.
- Convenciones de código: naming, manejo de errores en API routes, cómo se añaden nuevas variables de entorno (actualizar `.env.example` y `lib/env.ts`).
- Cómo correr y ampliar los tests E2E (dónde viven, cómo se autentica un test, cómo sembrar datos de test).
- Estado de producción (una vez exista, referenciar Bloque B: proveedor de storage real = Cloudflare R2, email real = Resend, hosting = Vercel, dominio = `registro.jpavon-tech.com`).
- **Verificación**: releer el archivo como si fuera la primera vez que se entra al repo — debe ser suficiente para orientarse sin leer todo el código.

### Fase A14 — Checklist de validación local (Definition of Done — Bloque A)
Antes de pasar a producción, confirmar que:
- [ ] `docker compose up -d` levanta Mongo, MailHog y RustFS sin fallos.
- [ ] `.env.local` desde `.env.example` es suficiente para arrancar (`npm run dev`).
- [ ] Seed corre limpio e idempotente.
- [ ] Flujo completo de administrado (login → instancia → adjunto → listado) funciona manualmente.
- [ ] Flujo completo de funcionario (ver todos → crear expediente → actuación → config home) funciona manualmente.
- [ ] RBAC verificado en servidor (probar forzar rutas/API ajenas al rol).
- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] `npm run test:e2e` en verde de forma reproducible (correrlo 2 veces seguidas).
- [ ] `AGENTS.md` completo y actualizado.

---

## BLOQUE B — PRODUCCIÓN

Servicios ya disponibles para esta fase (confirmados por el usuario): **MongoDB Atlas**, **Cloudflare** (dominio `jpavon-tech.com`, subdominio elegido: **`registro.jpavon-tech.com`**), **Vercel** (hosting), **Resend** (email transaccional), **Cloudflare R2** (storage S3, decisión tomada para reemplazar RustFS en prod). Flujo de repositorio: **GitLab es la fuente de verdad**, con mirroring configurado por el usuario hacia GitHub, y **Vercel importa el repositorio desde ese mirror de GitHub**. Este plan respeta ese flujo — no reconfigura el mirroring, que ya existe.

### Fase B0 — Preparación de servicios cloud
- **MongoDB Atlas**: crear (o confirmar) el cluster/proyecto para esta app; crear usuario de base de datos con permisos mínimos necesarios; configurar Network Access (permitir `0.0.0.0/0` solo si Vercel no ofrece IPs estáticas fijas para el plan usado, o usar el mecanismo de Vercel-Atlas integration si aplica); obtener `MONGODB_URI` de producción.
- **Cloudflare R2**: crear bucket dedicado (p. ej. `sede-electronica-adjuntos-prod`); crear API Token con permisos S3 (Object Read & Write) scoped solo a ese bucket; anotar Account ID, Access Key ID, Secret Access Key y el endpoint `https://<account_id>.r2.cloudflarestorage.com`.
- **Resend**: verificar el dominio de envío (añadir registros DKIM/SPF/DMARC que Resend indique en la zona DNS de Cloudflare para `jpavon-tech.com` o un subdominio de correo, p. ej. `mail.jpavon-tech.com`); generar API Key de producción.
- **Vercel**: crear el proyecto importando el repositorio desde el mirror de GitHub; NO tocar la configuración de mirroring GitLab→GitHub, que ya existe.
- **Cloudflare DNS**: preparar (sin activar aún) el registro para `registro.jpavon-tech.com` apuntando a Vercel (`CNAME` a `cname.vercel-dns.com`, o el valor que Vercel indique al añadir el dominio personalizado) — se activa en la Fase B4.
- **Verificación**: cada credencial obtenida y guardada de forma segura (gestor de secretos del equipo / Vercel Environment Variables — nunca en el repo).

### Fase B1 — Adaptar el código para producción
- Confirmar que `lib/storage.ts` funciona igual contra R2 que contra RustFS solo cambiando variables de entorno (`STORAGE_PROVIDER=r2`, endpoint y credenciales de R2). Si RustFS usa alguna particularidad no estándar de S3, aislarla detrás del adaptador.
- Implementar en `lib/mailer.ts` el segundo backend: cliente de Resend (`EMAIL_PROVIDER=resend`), respetando la misma interfaz (`sendMagicLinkEmail(to, link)`) que ya usa el backend SMTP/MailHog.
- Revisar `APP_SESSION_SECRET`/cookies: en producción, cookies `Secure`, `SameSite=Lax` (o `Strict` si no rompe el flujo de magic link entre dominios de email y app), y `NEXT_PUBLIC_APP_URL=https://registro.jpavon-tech.com`.
- Revisar límites de tamaño de subida de adjuntos compatibles con el plan de Vercel (funciones serverless/Edge) — si hace falta, subir directo del cliente a R2 con presigned PUT en vez de pasar por la función serverless.
- **Verificación**: build de producción (`npm run build`) sin warnings críticos; smoke test local usando credenciales reales de R2/Resend/Atlas en un `.env` temporal (no commiteado).

### Fase B2 — Variables de entorno de producción (Vercel)
Tabla de mapeo local → producción, todas configuradas como Environment Variables en Vercel (Production, y opcionalmente Preview con valores de un entorno de staging si se decide tener uno):

| Variable | Local | Producción |
|---|---|---|
| `MONGODB_URI` | Mongo local Docker | Connection string de Atlas |
| `STORAGE_PROVIDER` | `local` | `r2` |
| `S3_ENDPOINT` | RustFS `localhost:9000` | Endpoint de R2 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | credenciales RustFS | API Token de R2 |
| `S3_BUCKET_NAME` | bucket local | bucket prod de R2 |
| `EMAIL_PROVIDER` | `smtp` | `resend` |
| `RESEND_API_KEY` | (vacío) | API key de Resend |
| `EMAIL_FROM` | dirección local | dirección verificada en Resend |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://registro.jpavon-tech.com` |
| `APP_SESSION_SECRET` | valor de desarrollo | secreto fuerte generado para prod |

- **Verificación**: `.env.example` sigue siendo la única fuente de verdad de **nombres** de variables (no se agregan variables de producción que no estén ya documentadas ahí).

### Fase B3 — Pipeline de CI/CD (GitLab CI, respetando el mirror a GitHub → Vercel)
Contexto importante: el código vive en GitLab, se mirroriza automáticamente a GitHub, y Vercel despliega desde ese mirror de GitHub. Este pipeline **no reemplaza** el despliegue de Vercel — lo complementa como puerta de calidad antes de que el código llegue a `main`/`master` y se mirrorice.

- Crear `.gitlab-ci.yml` con stages: `install` → `lint` → `typecheck` → `test:unit` (si existen pruebas unitarias) → `build` → `test:e2e`.
- Stage `test:e2e`: levantar los servicios necesarios como *services* de GitLab CI o vía `docker compose` dentro del job (Mongo, MailHog, RustFS), correr `scripts/seed.ts` contra esa base de test, y ejecutar `npm run test:e2e` con Playwright (usar la imagen oficial de Playwright o instalar navegadores con `npx playwright install --with-deps` en el job).
- Configurar en GitLab la protección de la rama principal para que **requiera pipeline exitoso** antes de merge (branch protection / merge request pipelines), de modo que solo código que pasó lint+typecheck+build+E2E llegue a la rama que se mirroriza a GitHub y dispara el deploy en Vercel.
- Vercel deployments: dejar la integración tal cual está (Vercel construye y despliega automáticamente Preview Deployments por rama/MR reflejada en GitHub, y Production Deployment al actualizarse la rama de producción en el mirror). No se requiere `vercel.json` de despliegue custom salvo para configurar rewrites/headers si hiciera falta.
- Variables de entorno del pipeline (GitLab CI/CD Variables, marcadas como *protected* y *masked*): `MONGODB_URI` de test únicamente — nunca las credenciales de producción de R2/Resend/Atlas dentro del pipeline de CI.
- **Verificación**: un merge request con un cambio trivial dispara el pipeline completo, falla intencionalmente si se rompe un test E2E, y solo permite merge cuando todo está en verde.

### Fase B4 — Despliegue en Vercel + dominio `registro.jpavon-tech.com`
- En Vercel, añadir el dominio personalizado `registro.jpavon-tech.com` al proyecto.
- En Cloudflare DNS (zona `jpavon-tech.com`), crear el registro `CNAME` (o `A`/`ALIAS`, según lo que Vercel indique) para `registro` apuntando al valor que Vercel provee al añadir el dominio.
- Si el proxy de Cloudflare (nube naranja) está activado, verificar que no interfiera con la validación de dominio de Vercel (en general Vercel soporta Cloudflare proxied, pero si hay problemas de validación SSL, poner el registro en modo DNS-only mientras se valida y luego reactivar el proxy).
- Configurar todas las variables de la Fase B2 en Vercel → Project → Settings → Environment Variables (entorno Production).
- Disparar el primer deploy de producción (vía push a la rama de producción en el mirror de GitHub, como ya funciona).
- **Verificación**: `https://registro.jpavon-tech.com` responde con certificado TLS válido y la home carga correctamente con los datos de `config` reales.

### Fase B5 — Verificación E2E post-despliegue
- Adaptar (o duplicar) la config de Playwright para poder apuntar `baseURL` a `https://registro.jpavon-tech.com` mediante una variable de entorno (`E2E_BASE_URL`), sin depender de `webServer` local.
- Para el flujo de magic link en producción, dado que ya no hay MailHog, usar la bandeja de un email de prueba real vía la API de Resend (o un buzón de pruebas dedicado) para capturar el link, o correr un subconjunto reducido de smoke tests que no dependan de completar el login por email (p. ej. solo verificar que la home y el login cargan, status codes correctos, RBAC en endpoints públicos).
- Ejecutar manualmente (o como job manual en GitLab CI) un **smoke test** post-deploy: home carga, login envía correo real (verificar en Resend logs), subida de un adjunto de prueba llega a R2.
- **Verificación**: checklist de smoke test documentado y ejecutado tras el primer despliegue exitoso.

### Fase B6 — Actualizar el `README.md` original
Una vez confirmado el despliegue público:
- Editar el `README.md` existente (no crear uno nuevo) añadiendo una sección "Despliegue" o similar con: URL pública (`https://registro.jpavon-tech.com`), stack de producción (Atlas, R2, Resend, Vercel), y una nota breve del flujo de CI/CD (GitLab → mirror GitHub → Vercel).
- **Verificación**: el README refleja el estado real y funcional del proyecto en producción.

---

## 2. Decisiones ya confirmadas por el usuario (no volver a preguntar)

- Storage de producción: **Cloudflare R2**.
- Flujo de repositorio/CI: **GitLab (fuente de verdad) → mirror automático a GitHub → Vercel importa desde GitHub**. El pipeline de CI/CD vive en GitLab (`.gitlab-ci.yml`); no se reconfigura el mirroring, que ya existe y debe respetarse tal cual.
- Subdominio de despliegue: **`registro.jpavon-tech.com`** (zona ya gestionada en Cloudflare).
- Framework de testing E2E: **Playwright**.
- Servicios ya disponibles: MongoDB Atlas, Cloudflare (dominio + R2), Vercel, Resend.

## 3. Puntos que el agente debe confirmar con el usuario si aparecen durante la ejecución

- Si el plan de Vercel usado no soporta IPs estáticas salientes: decidir si Atlas se abre a `0.0.0.0/0` (aceptar el riesgo) o se usa un mecanismo alternativo (VPC peering / Vercel-Atlas integration, si el plan lo permite).
- Si se quiere un entorno de **staging** además de producción (Preview Deployments de Vercel con su propia base de datos/bucket de test) o si Preview usará directamente los recursos de producción con datos separados por namespace.
- Dirección de envío exacta para Resend (`no-reply@jpavon-tech.com` vs. un subdominio de correo dedicado) — impacta qué registros DNS hay que crear en Cloudflare.
- Si el rol de administrado debe poder ver el estado/actuaciones de su propio expediente (no estaba explícito en el alcance original; hoy solo el funcionario gestiona expedientes).