# ShadowCoders - System Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Design](#api-design)
9. [Real-time Features](#real-time-features)
10. [Security Features](#security-features)
11. [Deployment Architecture](#deployment-architecture)

## Overview

ShadowCoders is a comprehensive online examination platform designed for conducting secure, proctored exams with support for multiple question types including MCQ, Coding, Essay, Speaking, and Listening questions. The system provides automated grading, AI-powered question generation, and real-time monitoring capabilities.

### Key Features
- **Multi-question Type Support**: MCQ, Coding, Essay, Speaking, Listening, Fill-in-the-blank, Reading
- **Automated Grading**: Real-time code execution and automated scoring
- **AI Integration**: Google Gemini AI for question generation
- **Real-time Monitoring**: Socket.IO for live exam monitoring
- **Anti-cheating Measures**: Fullscreen enforcement, tab switch detection, copy/paste prevention
- **Manual Grading**: Rubric-based evaluation system for subjective questions
- **Result Analytics**: Comprehensive reporting and export capabilities

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Student    │  │    Admin     │  │   Landing    │      │
│  │   Portal     │  │   Portal     │  │    Page      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST + WebSocket
┌──────────────────────────┴──────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Next.js Frontend (React)                   │   │
│  │  - Server-Side Rendering                             │   │
│  │  - Client-Side Routing                               │   │
│  │  - State Management (Context + Hooks)                │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      API Gateway                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Express.js Backend (TypeScript)              │   │
│  │  - RESTful API                                       │   │
│  │  - WebSocket Server (Socket.IO)                      │   │
│  │  - Authentication Middleware                         │   │
│  │  - Request Validation (Zod)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐
│  PostgreSQL  │  │   Judge0 API    │  │  Gemini AI │
│   Database   │  │  (Code Exec)    │  │   Service  │
└──────────────┘  └─────────────────┘  └────────────┘
```

### Component Interaction Flow

```
User Request Flow:
1. User → Frontend (Next.js)
2. Frontend → Backend API (Express)
3. Backend → Database (Prisma ORM)
4. Backend → External Services (Judge0, Gemini)
5. Response flows back through the chain

Real-time Flow:
1. Student Activity → Socket.IO Client
2. Socket.IO Client → Socket.IO Server
3. Socket.IO Server → Admin Dashboard (Real-time updates)
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ (TypeScript)
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 6.x
- **Validation**: Zod 4.x
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **WebSocket**: Socket.IO 4.x
- **Code Execution**: Judge0 API + Local Executor
- **AI Service**: Google Generative AI (Gemini)
- **File Upload**: Multer
- **Security**: Helmet, CORS

### Frontend
- **Framework**: Next.js 16.x (React 19)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Charts**: Recharts 3.x
- **State Management**: React Context API + Custom Hooks
- **HTTP Client**: Axios
- **WebSocket Client**: Socket.IO Client
- **Form Handling**: React Hook Form + Zod
- **Animations**: GSAP + Lenis

### Infrastructure
- **Database Hosting**: Supabase (PostgreSQL)
- **Development**: Local development with hot reload
- **Build Tools**: TypeScript Compiler, Turbopack (Next.js)

## Backend Architecture

### Module Structure (MVC Pattern)

```
backend/src/
├── modules/              # Feature modules
│   ├── auth/            # Authentication & Authorization
│   │   ├── auth.controller.ts    # Route handlers
│   │   ├── auth.service.ts       # Business logic
│   │   ├── auth.repo.ts          # Data access layer
│   │   ├── auth.routes.ts        # Route definitions
│   │   ├── auth.zod.ts           # Validation schemas
│   │   └── token.service.ts      # JWT token management
│   │
│   ├── exams/           # Exam Management
│   ├── questions/       # Question Management
│   ├── attempts/        # Exam Attempts
│   ├── grading/         # Code Execution & Grading
│   ├── evaluations/     # Manual Evaluations
│   ├── rubrics/         # Grading Rubrics
│   ├── sections/        # Exam Sections
│   ├── assets/          # Media Assets
│   └── ai/              # AI Question Generation
│
├── middleware/          # Express Middleware
│   ├── auth.ts         # JWT authentication
│   ├── error.ts        # Error handling
│   └── validate.ts     # Request validation
│
├── lib/                 # Shared Utilities
│   ├── prisma.ts       # Prisma client singleton
│   ├── cookie-utils.ts # Cookie helpers
│   ├── judge0.ts       # Judge0 integration
│   ├── local-executor.ts # Local code execution
│   ├── execution-queue.ts # Execution queue manager
│   ├── gemini.ts       # Gemini AI integration
│   ├── db-health.ts    # Database health checks
│   └── socket.ts       # Socket.IO setup
│
├── config/              # Configuration
│   ├── cors.ts         # CORS configuration
│   └── env.ts          # Environment variables
│
├── types/               # TypeScript types
│   └── express/        # Express type extensions
│
├── app.ts              # Express app configuration
└── index.ts            # Server entry point
```

### Request Flow

```
1. HTTP Request → Express App (app.ts)
2. Middleware Chain:
   - CORS handling
   - Cookie parsing
   - Request validation (Zod)
   - Authentication (JWT)
   - Authorization (Role check)
3. Route Handler (Controller)
4. Service Layer (Business Logic)
5. Repository Layer (Data Access)
6. Database (Prisma ORM)
7. Response → Client
```

### Service Layer Pattern

Each module follows this pattern:
- **Controller**: Handles HTTP requests/responses
- **Service**: Contains business logic
- **Repository**: Handles database operations
- **Zod Schema**: Validates request data

Example:
```typescript
// Controller (auth.controller.ts)
export async function loginController(req: Request, res: Response) {
  const data = validate(loginSchema, req.body);
  const result = await authService.login(data);
  res.json(result);
}

// Service (auth.service.ts)
export async function login(data: LoginInput) {
  const user = await authRepo.findByEmail(data.email);
  // Business logic...
  return { accessToken, refreshToken };
}

// Repository (auth.repo.ts)
export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
```

## Frontend Architecture

### Directory Structure

```
frontend/
├── app/                 # Next.js App Router
│   ├── admin/          # Admin portal pages
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── attempts/
│   │   └── layout.tsx  # Admin layout
│   │
│   ├── student/        # Student portal pages
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── attempts/
│   │   └── layout.tsx  # Student layout
│   │
│   ├── login/          # Authentication
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Landing page
│
├── components/          # React Components
│   ├── admin/          # Admin components
│   ├── student/        # Student components
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
│
├── hooks/               # Custom React Hooks
│   ├── useExamSubmission.ts
│   ├── useAutoSave.ts
│   ├── useCheatingPrevention.ts
│   └── ...
│
├── context/             # React Context
│   ├── AuthContext.tsx
│   ├── ToastContext.tsx
│   └── ConfirmationContext.tsx
│
├── lib/                 # Utilities & Services
│   ├── api.ts          # Axios instance
│   └── socket.ts       # Socket.IO client
│
├── utils/               # Helper Functions
│   ├── answerFormatting.ts
│   ├── examCalculations.ts
│   └── ...
│
├── types/               # TypeScript Types
│   └── exam.ts
│
└── public/              # Static Assets
```

### Component Architecture

```
Page Component (app/student/exams/page.tsx)
    ↓
Layout Component (components/layout/StudentSidebar.tsx)
    ↓
Feature Components (components/student/exam/*)
    ↓
UI Components (components/ui/*)
    ↓
Hooks (hooks/useExamSubmission.ts)
    ↓
API Layer (lib/api.ts)
```

### State Management Strategy

1. **Local State**: `useState` for component-specific state
2. **Shared State**: Context API for global state (Auth, Toast, Confirmation)
3. **Server State**: Custom hooks with fetch logic
4. **Form State**: React Hook Form with Zod validation
5. **Real-time State**: Socket.IO event handlers

### Custom Hooks Pattern

```typescript
// useExamSubmission.ts
export function useExamSubmission(
  attempt: Attempt | null,
  questions: Question[],
  answers: Record<string, AnswerData>,
  attemptId: string | undefined,
  // ... dependencies
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmitExam = useCallback(async (isAutoSubmit: boolean) => {
    // Submission logic...
  }, [attempt, questions, answers, attemptId]);
  
  return { isSubmitting, error, handleSubmitExam, setError };
}
```

## Database Schema

### Core Entities

1. **User**: Students and Staff accounts
2. **Exam**: Exam definitions with timing and policies
3. **Question**: Questions of various types
4. **Section**: Exam sections grouping questions
5. **Attempt**: Student exam attempts
6. **Response**: Answers submitted by students
7. **Evaluation**: Manual grading records
8. **Rubric**: Grading rubrics for manual evaluation
9. **Asset**: Media files (audio, video, images)

### Relationships

```
User (1) ──< (M) Attempt ──< (1) Exam
                │
                └──< (M) Response ──< (1) Question
                                          │
                                          └──< (M) Section

Exam (1) ──< (M) Section ──< (M) SectionQuestion ──< (1) Question
Exam (1) ──< (M) Assignment ──< (1) User
Response (1) ──< (0..1) Evaluation ──< (1) Rubric
```

### Key Constraints

- **Unique Constraints**: Email, Registration Number, Google ID
- **Foreign Keys**: All relationships properly indexed
- **Enums**: Type-safe status and mode fields
- **Timestamps**: Created/Updated timestamps on all entities

## Authentication & Authorization

### Authentication Flow

```
1. User submits credentials → POST /api/auth/login
2. Server validates credentials
3. Server generates:
   - Access Token (JWT, short-lived, in Authorization header)
   - Refresh Token (long-lived, in HTTP-only cookie)
4. Client stores access token in memory/localStorage
5. Client includes access token in subsequent requests
6. Server validates JWT on each request
7. If expired, client uses refresh token to get new access token
```

### Authorization Levels

1. **Public**: No authentication required
2. **Student**: Must be authenticated with STUDENT role
3. **Staff**: Must be authenticated with STAFF role
4. **Owner**: Must own the resource (e.g., own attempt)

### Middleware Chain

```typescript
// Public route
app.get('/api/healthz', handler);

// Student route
app.get('/api/student/exams', 
  verifyAccess,      // Check JWT
  handler
);

// Staff route
app.get('/api/admin/exams',
  verifyAccess,      // Check JWT
  requireRole('STAFF'), // Check role
  handler
);
```

## API Design

### RESTful Principles

- **Resource-based URLs**: `/api/student/exams/:examId`
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Status Codes**: 200, 201, 400, 401, 403, 404, 500
- **JSON Responses**: Consistent response format

### Response Format

```typescript
// Success Response
{
  data: T,
  meta?: {
    total: number,
    page: number,
    pageSize: number
  }
}

// Error Response
{
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### API Versioning

Currently using `/api` prefix. Future versions can use `/api/v1`, `/api/v2`.

## Real-time Features

### Socket.IO Implementation

**Server Setup** (`backend/src/lib/socket.ts`):
- Namespace: `/exam-monitoring`
- Events:
  - `admin-join-exam`: Admin joins exam monitoring room
  - `activity-update`: Student activity update
  - `exam-activity`: Bulk activity data
  - `student-joined`: Student joins exam
  - `student-disconnected`: Student leaves

**Client Setup** (`frontend/lib/socket.ts`):
- Singleton Socket.IO client
- Automatic reconnection
- Token-based authentication

### Real-time Monitoring Flow

```
1. Student takes exam → Emits 'activity-update' events
2. Server receives event → Broadcasts to admin room
3. Admin dashboard receives update → Updates UI in real-time
```

## Security Features

### Frontend Security

1. **Anti-cheating Measures**:
   - Fullscreen enforcement
   - Tab switch detection
   - Copy/paste prevention
   - Keyboard shortcut blocking
   - Context menu disabling
   - Developer tools detection

2. **Authentication**:
   - JWT token management
   - Automatic token refresh
   - Protected routes (proxy.ts)

3. **Data Validation**:
   - Client-side Zod validation
   - Input sanitization

### Backend Security

1. **Authentication**:
   - JWT token validation
   - Refresh token rotation
   - Password hashing (bcrypt)

2. **Authorization**:
   - Role-based access control
   - Resource ownership checks

3. **Request Validation**:
   - Zod schema validation
   - Type-safe request handling

4. **Security Headers**:
   - Helmet.js for security headers
   - CORS configuration
   - Cookie security (httpOnly, secure, sameSite)

5. **Database Security**:
   - Row Level Security (RLS) in Supabase
   - Parameterized queries (Prisma)
   - SQL injection prevention

## Deployment Architecture

### Development

```
Backend: localhost:4000
Frontend: localhost:3000
Database: Supabase Cloud / Local PostgreSQL
```

### Production (Recommended)

```
┌─────────────────────────────────────────┐
│         CDN / Load Balancer             │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼─────┐        ┌──────▼──────┐
│ Frontend│        │   Backend   │
│ (Vercel)│        │  (Railway/  │
│         │◄──────►│  Render/    │
│         │  API   │  AWS EC2)   │
└─────────┘        └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  Supabase   │
                   │ PostgreSQL  │
                   └─────────────┘
```

### Environment Variables

**Backend** (`.env`):
- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct database connection (Supabase)
- `JWT_SECRET`: Secret for JWT signing
- `GOOGLE_API_KEY`: Gemini AI API key
- `JUDGE0_API_KEY`: Judge0 API key (optional)
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development/production)

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_API_BASE_URL`: Backend API base URL

## Performance Optimizations

### Backend

1. **Database**:
   - Indexed foreign keys
   - Query optimization
   - Connection pooling (Supabase)

2. **Code Execution**:
   - Execution queue for rate limiting
   - Local executor fallback
   - Timeout management

3. **Caching**:
   - Consider Redis for session storage (future)

### Frontend

1. **Rendering**:
   - Server-side rendering (Next.js)
   - Static page generation where possible
   - Code splitting

2. **State Management**:
   - Memoization with `useMemo`, `useCallback`
   - Debounced auto-save
   - Optimistic UI updates

3. **Network**:
   - Request retry logic
   - Exponential backoff
   - Request deduplication

## Error Handling

### Backend

- Centralized error handler middleware
- Structured error responses
- Database error handling
- External API error handling

### Frontend

- Error boundaries for React components
- Try-catch blocks in async operations
- User-friendly error messages
- Development-only console logging

## Testing Strategy (Future)

1. **Unit Tests**: Jest for backend, Vitest for frontend
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Playwright or Cypress
4. **Type Safety**: TypeScript strict mode

## Monitoring & Logging

1. **Development**: Console logs (development only)
2. **Production**: Structured logging (future: Winston, Pino)
3. **Error Tracking**: Future integration (Sentry)
4. **Analytics**: Future integration (Google Analytics)

---

**Last Updated**: November 2024
**Version**: 1.0.0

