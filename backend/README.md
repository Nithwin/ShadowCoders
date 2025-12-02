# ShadowCoders Backend

A modern, scalable TypeScript/Express REST API with Prisma (PostgreSQL) and Zod validation. Built for an online examination system with support for multiple question types, automated grading, and AI-powered question generation.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended 20+)
- **PostgreSQL** database (Supabase recommended)
- **npm** or **yarn** package manager

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
npm run setup:env

# 3. Run database migrations
npx prisma migrate deploy
npx prisma generate

# 4. Create admin user
npm run setup:admin

# 5. Start development server
npm run dev
```

The server will start on `http://localhost:4000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── cors.ts          # CORS configuration
│   │   └── env.ts           # Environment variables
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # Authentication & authorization
│   │   ├── error.ts         # Error handling
│   │   └── validate.ts      # Request validation
│   ├── modules/             # Feature modules (MVC pattern)
│   │   ├── auth/            # Authentication module
│   │   ├── exams/           # Exam management
│   │   ├── questions/       # Question management
│   │   ├── attempts/        # Exam attempts
│   │   ├── grading/         # Code execution & grading
│   │   ├── evaluations/     # Manual evaluations
│   │   ├── rubrics/         # Grading rubrics
│   │   ├── sections/        # Exam sections
│   │   ├── assets/          # Media assets
│   │   └── ai/              # AI question generation
│   ├── lib/                 # Shared utilities
│   │   ├── prisma.ts        # Prisma client
│   │   ├── cookie-utils.ts  # Cookie utilities
│   │   ├── judge0.ts        # Judge0 integration
│   │   ├── local-executor.ts # Local code execution
│   │   ├── execution-queue.ts # Code execution queue
│   │   ├── gemini.ts        # Google Gemini AI
│   │   └── db-health.ts     # Database health check
│   ├── types/               # TypeScript type definitions
│   ├── app.ts               # Express app setup
│   └── index.ts             # Server entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── scripts/                 # Utility scripts
│   ├── setup-env.js         # Environment setup
│   ├── create-admin-user.js # Create admin user
│   ├── setup-admin-auto.js  # Auto-setup admin
│   ├── test-db-connection.ts # Test database
│   └── check-rls-status.ts  # Check RLS status
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Environment Variables

Create a `.env` file in the `backend/` directory:

### Option 1: Local PostgreSQL (Recommended for Development)

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration - Local PostgreSQL
USE_SUPABASE=false
DATABASE_URL="postgresql://postgres:password@localhost:5432/shadowcoders?schema=public"
LOCAL_DATABASE_URL="postgresql://postgres:password@localhost:5432/shadowcoders?schema=public"

# Authentication
JWT_SECRET="your_jwt_secret_here"

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:3000

# Google AI (Optional)
GOOGLE_API_KEY=

# Code Execution Configuration
# OS for code execution: 'windows', 'linux', or 'darwin' (macOS)
# This determines which commands to use (e.g., python vs python3)
EXECUTION_OS=windows  # Use 'linux' or 'darwin' for Unix-based systems
MAX_CONCURRENT_EXECUTIONS=5

# File Uploads (Optional - defaults to 'uploads' in project root)
# Used for storing LISTENING audio files and SPEAKING recordings
# UPLOADS_DIR=/path/to/custom/uploads/directory
```

### Option 2: Supabase (Cloud Database)

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration - Supabase
USE_SUPABASE=true
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-xxxxx.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:password@aws-0-xxxxx.pooler.supabase.com:5432/postgres"

# Authentication
JWT_SECRET="your_jwt_secret_here"

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:3000

# Google AI (Optional)
GOOGLE_API_KEY=

# Code Execution Configuration
# OS for code execution: 'windows', 'linux', or 'darwin' (macOS)
# This determines which commands to use (e.g., python vs python3)
EXECUTION_OS=windows  # Use 'linux' or 'darwin' for Unix-based systems
MAX_CONCURRENT_EXECUTIONS=5

# File Uploads (Optional - defaults to 'uploads' in project root)
# Used for storing LISTENING audio files and SPEAKING recordings
# UPLOADS_DIR=/path/to/custom/uploads/directory
```

### Setup Options

**Interactive Setup:**
```bash
npm run setup:env
```

**Local Database Setup (Recommended for Development):**
```bash
npm run setup:local-db
```

This will:
1. Check if PostgreSQL is installed
2. Create the database
3. Run migrations
4. Update .env file
5. Generate Prisma Client

**See [Local Database Setup Guide](./docs/LOCAL_DATABASE_SETUP.md) for detailed instructions.**

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Email/password login | No |
| POST | `/api/auth/google/callback/` | Google OAuth callback | No |
| GET | `/api/me` | Get current user | Yes |
| POST | `/api/auth/refresh` | Refresh access token | Yes |
| POST | `/api/auth/logout` | Logout | Yes |

### Exam Management (Staff Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/admin/exams` | Create exam | Staff |
| GET | `/api/admin/exams` | List exams (paginated) | Staff |
| GET | `/api/admin/exams/:examId` | Get exam details | Staff |
| PUT | `/api/admin/exams/:examId` | Update exam | Staff |
| POST | `/api/admin/exams/:examId/assign` | Assign exam to students | Staff |
| POST | `/api/admin/exams/:examId/publish` | Publish exam | Staff |
| GET | `/api/admin/exams/:examId/export` | Export results to Excel | Staff |

### Student Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/student/exams` | List available exams | Student |
| GET | `/api/student/exams/:examId` | Get exam for taking | Student |
| POST | `/api/student/exams/:examId/start` | Start exam attempt | Student |
| GET | `/api/student/attempts/:attemptId` | Get attempt details | Student |
| POST | `/api/student/attempts/:attemptId/responses` | Submit answer | Student |
| POST | `/api/student/attempts/:attemptId/submit` | Submit exam | Student |
| GET | `/api/student/attempts/:attemptId/results` | Get attempt results | Student |
| GET | `/api/student/attempts/:attemptId/question/:questionId` | Get question | Student |

### Question Management (Staff Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/admin/exams/:examId/questions` | Add questions to exam | Staff |
| GET | `/api/admin/exams/:examId/questions` | List questions for exam | Staff |
| PUT | `/api/admin/questions/:questionId` | Update question | Staff |
| DELETE | `/api/admin/questions/:questionId` | Delete question | Staff |

### Section Management (Staff Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/exams/:examId/sections` | List sections for exam | Staff |
| POST | `/api/admin/exams/:examId/sections` | Create section | Staff |
| PUT | `/api/admin/sections/:sectionId` | Update section | Staff |
| DELETE | `/api/admin/sections/:sectionId` | Delete section | Staff |
| POST | `/api/admin/sections/:sectionId/questions` | Add questions to section | Staff |
| DELETE | `/api/admin/sections/:sectionId/questions/:questionId` | Remove question from section | Staff |

### Code Execution

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/student/attempts/:attemptId/run-code` | Run code (Judge0) | Student |
| GET | `/api/queue/status` | Get execution queue status | No |

### AI Question Generation (Staff Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/admin/exams/:examId/ai/generate-questions` | Generate questions with AI | Staff |

### Asset Management (Staff Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/admin/assets` | Upload asset | Staff |
| GET | `/api/admin/assets` | List assets | Staff |
| GET | `/api/admin/assets/:assetId` | Get asset | Staff |
| DELETE | `/api/admin/assets/:assetId` | Delete asset | Staff |

### Evaluation Management (Staff Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/evaluations` | List evaluations | Staff |
| POST | `/api/admin/evaluations` | Create evaluation | Staff |
| PUT | `/api/admin/evaluations/:evaluationId` | Update evaluation | Staff |

### Rubric Management (Staff Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/rubrics` | List rubrics | Staff |
| POST | `/api/admin/rubrics` | Create rubric | Staff |
| PUT | `/api/admin/rubrics/:rubricId` | Update rubric | Staff |
| DELETE | `/api/admin/rubrics/:rubricId` | Delete rubric | Staff |

### Health & Testing

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/healthz` | Health check | No |
| GET | `/api/test-cors` | CORS test | No |

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)

# Utilities
npm run setup:env        # Interactive environment setup
npm run setup:local-db   # Setup local PostgreSQL database
npm run create:admin     # Create admin user
npm run setup:admin      # Auto-setup admin (with error handling)
npm run test:db          # Test database connection
npm run check:rls        # Check Row Level Security (RLS) status (Supabase only)
```

## 🏗️ Architecture

### Module Structure

Each feature module follows a consistent MVC-like pattern:

```
module/
├── *.controller.ts    # Request handlers (route handlers)
├── *.service.ts       # Business logic
├── *.repo.ts          # Database operations (Prisma)
├── *.routes.ts        # Route definitions
└── *.zod.ts           # Validation schemas (Zod)
```

### Middleware Stack

1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing (custom implementation)
3. **Cookie Parser** - Parse cookies
4. **JSON Parser** - Parse JSON bodies
5. **Authentication** - JWT token verification
6. **Authorization** - Role-based access control
7. **Validation** - Request validation with Zod
8. **Error Handler** - Centralized error handling

### Authentication Flow

1. **Login**: User provides email/password → Server returns access token + refresh token (HTTP-only cookie)
2. **Protected Routes**: Client sends access token in `Authorization: Bearer <token>` header
3. **Token Refresh**: Client calls `/api/auth/refresh` → Server returns new access token
4. **Logout**: Client calls `/api/auth/logout` → Server clears refresh token cookie

### Database Schema

- **Users**: Students and staff
- **Exams**: Exam definitions
- **Sections**: Exam sections
- **Questions**: Questions (MCQ, Coding, Essay, etc.)
- **Attempts**: Student exam attempts
- **Responses**: Student answers
- **Evaluations**: Manual evaluations
- **Rubrics**: Grading rubrics
- **Assets**: Media assets (images, audio, video)

### Question Types

- **MCQ**: Multiple choice questions
- **CODING**: Coding questions with test cases
- **ESSAY**: Essay questions with word limit
- **SPEAKING**: Speaking questions (future)
- **LISTENING**: Listening questions (future)
- **FILL**: Fill in the blank (future)
- **READING**: Reading comprehension (future)

### Code Execution

- **Judge0**: External API for code execution (default)
- **Local**: Local code execution (for development)
- **Queue System**: Manages concurrent code executions
- **Supported Languages**: JavaScript, Python, Java, C++, etc.

## 🔒 Security

- **Helmet.js** - Security headers
- **CORS** - Configured for credentials
- **JWT** - Token-based authentication
- **HTTP-only Cookies** - Refresh tokens stored securely
- **Role-based Authorization** - STUDENT, STAFF roles
- **Input Validation** - Zod schemas for all inputs
- **SQL Injection Protection** - Prisma ORM
- **Password Hashing** - bcrypt with salt rounds
- **Row Level Security (RLS)** - Database-level security (Supabase)

## 📝 Code Standards

- **TypeScript** - Strict mode enabled
- **Zod** - Runtime validation
- **Prisma** - Type-safe database access
- **Error Handling** - Centralized error handler
- **Modular Architecture** - Feature-based modules
- **Consistent Naming** - camelCase for variables, PascalCase for types
- **Code Organization** - Clear separation of concerns

## 🧪 Testing

### Health Check

```bash
curl http://localhost:4000/api/healthz
```

### CORS Test

```bash
curl -H "Origin: http://localhost:3000" \
     http://localhost:4000/api/test-cors
```

### Database Connection Test

```bash
npm run test:db
```

### RLS Status Check

```bash
npm run check:rls
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
npm run test:db

# Check RLS status (Supabase only)
npm run check:rls

# Verify DATABASE_URL in .env
# For Supabase: Make sure project is active (not paused)
# For Local: Make sure PostgreSQL is running
```

### Local Database Setup

If your network blocks Supabase, use local PostgreSQL:

```bash
# Setup local database
npm run setup:local-db

# This will:
# 1. Create database
# 2. Run migrations
# 3. Update .env file
# 4. Generate Prisma Client
```

**See [Local Database Setup Guide](./docs/LOCAL_DATABASE_SETUP.md) for detailed instructions.**

### CORS Errors

- Ensure `FRONTEND_ORIGIN` is set correctly in `.env`
- Restart backend after changing CORS settings
- Test in Postman first to isolate the issue
- Check browser console for CORS errors

### Port Already in Use

```bash
# Change PORT in .env file
PORT=4001

# Or kill the process using the port
# Windows: netstat -ano | findstr :4000
# Linux/Mac: lsof -i :4000
```

### JWT Token Issues

- Ensure `JWT_SECRET` is set in `.env`
- Generate a new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Clear browser cookies and login again

### Prisma Issues

```bash
# Regenerate Prisma client
npm run prisma:generate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

## 📄 License

ISC
