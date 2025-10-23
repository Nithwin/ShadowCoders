# ShadowCoders Backend

A TypeScript/Express API with Prisma (PostgreSQL) and Zod validation.

## Stack

- Node.js 18+ (recommended 20)
- TypeScript 5
- Express 5
- Prisma 6 (PostgreSQL)
- Zod 4 (runtime validation)
- JWT (jsonwebtoken)
- Helmet, CORS, Cookie Parser

## Project layout

```
backend/
  src/
    app.ts                # Express app factory and middleware
    index.ts              # Server bootstrap
    config/env.ts         # Env loader and typed access
    middleware/
      auth.ts             # AuthN/Z helpers (JWT, requireRole)
      validate.ts         # Zod-powered request validator
      error.ts            # Centralized error handler
    modules/
      auth/               # Login + me
      exams/              # Create exams
      questions/          # Bulk add questions to exam
  prisma/
    schema.prisma         # Database schema
```

## Prerequisites

- PostgreSQL running and reachable
- Create a database (e.g. `shadowcoders`)
- Copy your DB URL

## Environment variables

Create a `.env` file in `backend/` with:

```
# Server
PORT=4000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/shadowcoders?schema=public"
# Optional, used by Prisma for direct connections
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/shadowcoders?schema=public"

# Auth
JWT_SECRET="replace-with-a-long-random-string"
```

> Tip (Windows PowerShell): to quickly generate a secret you can use `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`.

## Install & database setup

```powershell
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
```

Open Prisma Studio (optional):

```powershell
npx prisma studio
```

## Run the API in development

```powershell
npm run dev
```

By default the server listens on http://localhost:4000. Health check: `GET /api/healthz`.

## API overview

Auth
- POST `/api/auth/login` — email/password login, returns `{ accessToken }` and sets `refreshToken` cookie
- POST `/api/auth/google/callback/` — Google OAuth callback payload (expects profile), returns `{ accessToken }` and sets cookie
- GET `/api/me` — returns current user, requires `Authorization: Bearer <token>`

Exams (admin)
- POST `/api/admin/exams` — create an exam
  - Body is validated by Zod (`createExamSchema`) and includes:
    - `title` (string, min 3)
    - `description?` (string)
    - `startAt`, `endAt` (ISO-8601 strings)
    - `durationMins` (int >= 1)
    - `timingMode` (`OVERALL_ONLY | PER_SECTION_ONLY | BOTH`)
    - `sectionLockPolicy` (`NONE | LOCK_ON_COMPLETE | LINEAR_NO_BACKTRACK`)
    - `randomizeQuestions?` (boolean)
    - `negativeMarkPerWrong?` (number)

Questions (admin)
- POST `/api/admin/exams/:examId/questions` — bulk add questions to exam
  - Protected by `verifyAccess` and `requireRole('STAFF')`

## Middleware

- `validate(schema)` — parses `{ body, query, params }` with Zod. On success, `req.body` is replaced with the validated body. On failure, responds 400 with structured issues; unexpected errors return 500.
- `verifyAccess` — validates JWT from `Authorization: Bearer <token>` and attaches `{ sub, role }` to `req.user`.
- `requireRole(role)` — requires a specific role (e.g. `STAFF`).
- `errorHandler` — consistent JSON error responses.

## Coding standards

- Zod schemas live next to their modules (e.g., `exam.zod.ts`).
- Prisma JSON columns use `Prisma.JsonNull` for SQL NULL when assigning.
- Prefer minimal logging in production; `console.error` is used for error reporting in the error handler.

## Common Prisma commands

```powershell
# Create and apply a new migration
npx prisma migrate dev --name <name>

# Regenerate client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

## Troubleshooting

- If Zod methods like `string().datetime()` or `nativeEnum()` are struck-out, ensure `zod` is up to date (`npm i zod@latest`).
- Type errors assigning `null` to JSON columns: use `Prisma.JsonNull` instead of `null`.

## License

ISC (see repository root).
