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

### Quick Setup (Recommended)

Run the interactive setup script:

```powershell
npm run setup:env
```

This will guide you through creating your `.env` file with Supabase credentials.

### Manual Setup

Create a `.env` file in `backend/` with:

```env
# Server
PORT=4000
NODE_ENV=development

# Database - Supabase Connection
# Connect via connection pooling (for application use)
DATABASE_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (used for migrations)
DIRECT_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Auth
JWT_SECRET="replace-with-a-long-random-string"

# Frontend
FRONTEND_ORIGIN=http://localhost:3000

# For Vercel deployment with ngrok
# FRONTEND_ORIGIN=https://your-vercel-app.vercel.app

# Multiple allowed origins (comma-separated)
# ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://another-app.vercel.app

# Allow ngrok URLs dynamically (default: true)
ALLOW_NGROK=true

# Google API Key (for AI features)
GOOGLE_API_KEY=your_google_api_key
```

**To get your database password:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `wvkzbtmofbrftmgqpzwd`
3. Navigate to **Settings** → **Database**
4. Find your **Database password** (or reset it if needed)
5. Replace `[YOUR-PASSWORD]` in both `DATABASE_URL` and `DIRECT_URL`

**To generate JWT_SECRET:**
- Windows PowerShell: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`
- Or use: `npm run setup:env` (auto-generates it)

See `SETUP_ENV.md` for detailed instructions.

## 🚀 ngrok Setup (for Vercel Frontend)

To expose your local backend to a Vercel-hosted frontend, use ngrok:

### Quick Start

1. **Install ngrok:**
   ```powershell
   # Windows (Chocolatey)
   choco install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Authenticate ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```
   Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken

3. **Configure backend .env:**
   ```env
   FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
   ALLOW_NGROK=true
   ```

4. **Start backend and ngrok:**
   ```powershell
   # Windows
   .\scripts\start-backend-ngrok.ps1
   
   # Or manually:
   # Terminal 1: npm run dev
   # Terminal 2: ngrok http 4000
   ```

5. **Copy ngrok URL** (e.g., `https://abc123.ngrok-free.app`)

6. **Configure Vercel:**
   - Go to Vercel project → Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_BASE_URL=https://your-ngrok-url.ngrok-free.app/api`
   - Redeploy your Vercel app

See [docs/NGROK_QUICK_START.md](./docs/NGROK_QUICK_START.md) for detailed instructions.

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

### Auth
- **POST** `/api/auth/login` — Email/password login, returns `{ accessToken }` and sets `refreshToken` cookie
- **POST** `/api/auth/google/callback/` — Google OAuth callback payload (expects profile), returns `{ accessToken }` and sets cookie
- **GET** `/api/me` — Returns current user profile, requires `Authorization: Bearer <token>`

### Exams (Admin - Staff Only)

#### Create Exam
- **POST** `/api/admin/exams` — Create a new exam
  - Protected by `verifyAccess` and `requireRole('STAFF')`
  - Body validated by `createExamSchema`:
    - `title` (string, min 3 characters)
    - `description?` (optional string)
    - `startAt`, `endAt` (ISO-8601 datetime strings)
    - `durationMins` (integer >= 1)
    - `timingMode` (`OVERALL_ONLY | PER_SECTION_ONLY | BOTH`)
    - `sectionLockPolicy` (`NONE | LOCK_ON_COMPLETE | LINEAR_NO_BACKTRACK`)
    - `randomizeQuestions?` (optional boolean)
    - `negativeMarkPerWrong?` (optional number)
  - Returns created exam with status `DRAFT`

#### Assign Exam
- **POST** `/api/admin/exams/:examId/assign` — Assign exam to students or cohorts
  - Protected by `verifyAccess` and `requireRole('STAFF')`
  - Body validated by `assignExamSchema`:
    - `cohortYear?` (integer 1-6)
    - `cohortDepartment?` (string, max 50)
    - `cohortSection?` (string, max 10)
    - `studentIds?` (array of CUIDs, max 1000)
  - Must provide either cohort details OR student IDs (not both)
  - Returns exam assignment record

#### Publish Exam
- **POST** `/api/admin/exams/:examId/publish` — Publish a draft exam
  - Protected by `verifyAccess` and `requireRole('STAFF')`
  - Only DRAFT exams can be published
  - Updates exam status to `PUBLISHED`
  - Returns updated exam

#### List Exams
- **GET** `/api/admin/exams` — Get paginated list of exams with filtering
  - Protected by `verifyAccess` and `requireRole('STAFF')`
  - Query parameters validated by `listExamsSchema`:
    - `page?` (integer >= 1, default: 1)
    - `pageSize?` (integer 1-100, default: 10)
    - `status?` (enum: `DRAFT | PUBLISHED | ONGOING | COMPLETED`)
    - `q?` (search query - searches in title and description)
  - Returns:
    ```json
    {
      "data": [...exams],
      "meta": {
        "page": 1,
        "pageSize": 10,
        "totalCount": 50,
        "totalPages": 5
      }
    }
    ```

### Questions (Admin - Staff Only)
- **POST** `/api/admin/exams/:examId/questions` — Bulk add questions to exam
  - Protected by `verifyAccess` and `requireRole('STAFF')`
  - Body validated by `bulkQuestionsSchema`

## Middleware

- **`validate(schema)`** — Parses and validates `{ body, query, params }` with Zod schemas
  - On success: assigns validated data back to request object with defaults applied
  - On validation failure: responds with 400 and structured error issues
  - On unexpected errors: responds with 500 and error details
  - Handles null-prototype objects (Express query params) properly
  
- **`verifyAccess`** — JWT authentication middleware
  - Validates JWT from `Authorization: Bearer <token>` header
  - Attaches decoded `{ sub, role }` to `req.user`
  - Returns 401 if token is missing or invalid
  
- **`requireRole(role)`** — Role-based authorization middleware
  - Requires specific role (e.g., `STAFF`, `ADMIN`)
  - Must be used after `verifyAccess`
  - Returns 403 if user doesn't have required role
  
- **`errorHandler`** — Centralized error handling middleware
  - Provides consistent JSON error responses
  - Handles both custom errors and unexpected exceptions

## Current Implementation Status

### ✅ Completed Features

#### Authentication & Authorization
- [x] User registration and login with email/password
- [x] JWT-based authentication (access token + refresh token)
- [x] Google OAuth integration
- [x] Role-based access control (STUDENT, STAFF, ADMIN)
- [x] Protected routes with middleware

#### Exam Management (Staff)
- [x] Create exams with full configuration
- [x] Assign exams to students (by cohort or individual IDs)
- [x] Publish draft exams
- [x] List exams with pagination and filtering
- [x] Search exams by title/description
- [x] Filter exams by status

#### Question Management (Staff)
- [x] Bulk add questions to exams
- [x] Support for multiple question types
- [x] Question validation with Zod

#### Database & Validation
- [x] Prisma ORM with PostgreSQL
- [x] Type-safe database operations
- [x] Zod schema validation for all endpoints
- [x] Proper handling of JSON columns
- [x] Database migrations setup

### 🚧 In Progress / Planned

- [ ] Student exam taking functionality
- [ ] Real-time exam timer
- [ ] Automatic exam submission
- [ ] Answer submission and validation
- [ ] Exam results and analytics
- [ ] Question randomization implementation
- [ ] Section-based exam navigation
- [ ] Image upload for questions
- [ ] Exam preview for staff
- [ ] Draft saving for students

## Coding standards

- **Module Structure**: Each module follows a consistent pattern:
  - `*.controller.ts` — Request handlers
  - `*.service.ts` — Business logic
  - `*.repo.ts` — Database operations
  - `*.routes.ts` — Route definitions
  - `*.zod.ts` — Zod validation schemas

- **Validation**: Zod schemas are defined per module and validate request body, query, and params
- **Error Handling**: Use structured error objects with `{ status, message }` for custom errors
- **Database Operations**: 
  - Use Prisma for all database operations
  - Use `Prisma.JsonNull` for SQL NULL in JSON columns
  - Always handle potential null returns from database queries
- **Type Safety**: Leverage TypeScript strict mode and Zod inference for type safety
- **Authentication**: All admin endpoints require `verifyAccess` and `requireRole('STAFF')`
- **Logging**: Minimal logging in production; use `console.error` for error reporting only

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
