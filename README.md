# 🏛️ Sede Electrónica — Registro General de la Administración

## 🎯 Objetivo del proyecto

Construir una **sede electrónica** al estilo de la administración pública española: el ciudadano (administrado) presenta instancias generales y el funcionario las tramita creando expedientes con actuaciones.

Con este proyecto el alumno aprende:

- A modelar un **flujo administrativo real**: registro de entrada → expediente → actuaciones.
- **Dos roles con vistas opuestas** sobre los mismos datos (administrado vs funcionario).
- Subida de **ficheros adjuntos a S3** dentro de un formulario.
- El concepto **SaaS de personalización**: el funcionario configura la apariencia de la home.

## 🏗️ Arquitectura

```
┌──────────────┐         ┌──────────────────┐        ┌──────────┐
│  Next.js     │ ──────► │   API Routes     │ ─────► │ MongoDB  │
│  administrado│         │  registros,      │        └──────────┘
│  funcionario │         │  expedientes,    │        ┌──────────┐
└──────────────┘         │  actuaciones,    │ ─────► │RustFS S3 │ (adjuntos)
       ▲                 │  auth, config    │        └──────────┘
       │                 └────────┬─────────┘        ┌──────────┐
   GlobalContext                  └────────────────► │ MailHog  │ (magic link)
   (usuario, rol)                                    └──────────┘
```

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 + TypeScript + Tailwind, `GlobalContext` para usuario/rol |
| Base de datos | MongoDB driver nativo (singleton `lib/db.ts`) |
| Storage | S3 vía RustFS (Docker), presigned URLs, bucket autocreado |
| Email | MailHog (magic link) |
| Protección de rutas | `proxy.ts` |

### Modelo de dominio

```
Instancia General (Registro)
  ├─ interesado (nombre, dirección fiscal)
  ├─ representante (opcional)
  ├─ expone (texto)  /  solicita (texto)
  └─ ficheros adjuntos (S3)

Expediente
  ├─ código único + fecha de creación
  ├─ contribuyente sujeto (ref. al administrado)
  ├─ tipo de expediente
  └─ actuaciones[] { fecha, texto }
```

## ⚙️ Funcionalidades

**Administrado**: autenticarse con magic link, presentar instancia general con adjuntos, consultar sus presentaciones previas.

**Funcionario**: ver los registros de **todos** los administrados, crear un expediente asociado a un registro, añadir actuaciones al expediente, y personalizar los datos de la home (modo SaaS).

## 💡 Solución

1. **El rol define la vista**: el administrado solo ve consultas filtradas por su usuario; el funcionario consulta sin filtro y tiene acciones de tramitación. La comprobación se hace en servidor (API + `proxy.ts`), nunca solo en el cliente.
2. **Registro → Expediente**: el expediente nace *a partir de* un registro (decisión del funcionario), guardando la referencia. Las actuaciones son un array embebido en el expediente — un buen ejemplo de cuándo embeber vs referenciar en MongoDB.
3. **Adjuntos a S3**: los ficheros de la instancia van al bucket de RustFS y el registro guarda las claves; la descarga usa URLs prefirmadas.
4. **Personalización SaaS**: una colección de configuración almacena los textos/datos de la home que el funcionario puede editar; la home los lee en cada render.

## 🚀 Cómo ejecutar

1. Arranca MongoDB local, MailHog y RustFS en Docker.
2. Crea `.env.local` con `MONGODB_URI`, la config de RustFS (`http://localhost:9001`, credenciales `rustfsadmin`) y MailHog (`localhost:1025`).
3. Instala, siembra y arranca:

```bash
npm install
npx tsx scripts/seed.ts
npm run dev
```

4. Magic links visibles en [http://localhost:8025](http://localhost:8025).

<!-- BEGIN cc:que-se-valora -->
¡Hola! Aquí te explico qué miramos cuando corregimos tu proyecto "Registro", para que sepas dónde poner el foco.

## 📋 Qué se valora

Lo que más pesa es que tu aplicación funcione como se espera y cumpla con todo lo que pide el enunciado. También es muy importante que tu código esté bien escrito, sea fácil de entender y que la estructura general de tu proyecto tenga sentido. El vídeo demo es otra parte importante, ya que nos ayuda a ver tu proyecto en acción y cómo lo presentas. Finalmente, aunque con un peso menor, valoramos que expliques bien tus decisiones y que la documentación sea clara.

Recuerda que el enunciado del proyecto es la guía principal y que la evaluación no te penalizará por cosas que no se pidan explícitamente allí.
<!-- END cc:que-se-valora -->
