# ShadowCoders - Developer Documentation

Complete developer documentation for the ShadowCoders exam management platform.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Authentication & Authorization](#authentication--authorization)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Frontend Architecture](#frontend-architecture)
9. [Backend Architecture](#backend-architecture)
10. [Key Features & Flows](#key-features--flows)
11. [Development Setup](#development-setup)
12. [Environment Variables](#environment-variables)
13. [Code Organization Patterns](#code-organization-patterns)
14. [Testing](#testing)
15. [Deployment](#deployment)
16. [Troubleshooting](#troubleshooting)

---

## Overview

ShadowCoders is a comprehensive exam management platform that allows administrators to create, manage, and grade exams, while students can take exams with various question types (MCQ, Coding, Essay, etc.). The platform includes AI-powered question generation, automatic grading for coding questions, manual grading for essays, and comprehensive analytics.

### Key Features

- **Multi-role System**: STAFF (administrators) and STUDENT roles
- **Question Types**: MCQ, Coding, Essay, Speaking, Listening, Fill-in-the-blank, Reading
- **AI Integration**: Google Gemini API for question generation
- **Code Execution**: Judge0 API for running and testing code submissions
- **Auto-grading**: Automatic grading for MCQ and Coding questions
- **Manual Grading**: Staff can manually grade essay questions with rubrics
- **Exam Management**: Create, publish, assign exams to students or cohorts
- **Section-based Exams**: Organize questions into sections with different timing modes
- **Anti-cheating Measures**: Fullscreen mode, tab switching detection, keyboard shortcuts disabled
- **Analytics**: Excel export of exam results and submissions

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │◄───────►│    Backend      │
│   (Next.js)     │  HTTP   │   (Express)     │
│   Port: 3000    │         │   Port: 4000    │
└─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │   PostgreSQL    │
                            │   (Prisma ORM)  │
                            └─────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Google Gemini │           │   Judge0 API  │           │  Google OAuth │
│   (AI)        │           │ (Code Exec)   │           │  (Auth)       │
└───────────────┘           └───────────────┘           └───────────────┘
```

### Request Flow

1. **Authentication**: User logs in via email/password or Google OAuth
2. **Token Management**: JWT access tokens (short-lived) + refresh tokens (httpOnly cookies)
3. **API Requests**: Frontend sends requests with Bearer token in Authorization header
4. **Authorization**: Backend middleware verifies token and checks role permissions
5. **Business Logic**: Controllers → Services → Repositories → Database
6. **Response**: JSON responses with consistent error handling

---

## Technology Stack

### Frontend

- **Framework**: Next.js 15.5.3 (React 19.1.0)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API (AuthContext)
- **Form Handling**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **UI Components**: Radix UI, Lucide React icons
- **Animation**: GSAP, Lenis
- **Build Tool**: Turbopack

### Backend

- **Runtime**: Node.js 18+ (recommended 20)
- **Framework**: Express 5.1.0
- **Language**: TypeScript 5.9.3
- **Database**: PostgreSQL
- **ORM**: Prisma 6.17.1
- **Validation**: Zod 4.1.12
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, Cookie Parser
- **AI Integration**: Google Generative AI (@google/generative-ai)
- **Code Execution**: Judge0 API
- **File Processing**: Multer
- **Excel Export**: ExcelJS

---

## Project Structure

### Frontend Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin pages
│   │   ├── dashboard/           # Admin dashboard
│   │   ├── exams/               # Exam management
│   │   │   ├── new/            # Create exam
│   │   │   ├── [examId]/       # Exam details
│   │   │   │   ├── edit/       # Edit exam
│   │   │   │   └── submissions/# View submissions
│   │   ├── attempts/            # View attempts
│   │   ├── submissions/         # All submissions
│   │   └── layout.tsx           # Admin layout
│   ├── student/                 # Student pages
│   │   ├── dashboard/           # Student dashboard
│   │   ├── exams/               # Available exams
│   │   ├── attempts/            # Exam attempts
│   │   │   └── [attemptId]/    # Take exam / View results
│   │   └── results/             # Exam results
│   ├── login/                   # Login page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
│
├── components/                   # React components
│   ├── admin/                   # Admin components
│   │   ├── exam/               # Exam management components
│   │   ├── question/           # Question management
│   │   └── GenerateAiQuestionsModal.tsx
│   ├── student/                 # Student components
│   │   ├── exam/               # Exam-taking components
│   │   └── questions/          # Question type components
│   ├── ui/                      # Reusable UI components
│   └── layout/                  # Layout components
│
├── lib/                         # Utility libraries
│   ├── api.ts                   # Axios instance with interceptors
│   ├── api-admin.ts            # Admin API client
│   └── google-auth.ts          # Google OAuth utilities
│
├── context/                     # React contexts
│   └── AuthContext.tsx         # Authentication context
│
├── types/                       # TypeScript types
│   └── index.ts                # Shared types
│
├── constants/                   # Constants
│   └── index.ts
│
└── public/                      # Static assets
    ├── fonts/                   # Custom fonts
    ├── images/                  # Images
    └── videos/                  # Videos
```

### Backend Structure

```
backend/
├── src/
│   ├── app.ts                   # Express app factory
│   ├── index.ts                 # Server bootstrap
│   │
│   ├── config/                  # Configuration
│   │   └── env.ts              # Environment variables
│   │
│   ├── middleware/              # Express middleware
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── error.ts            # Error handling
│   │   └── validate.ts         # Request validation
│   │
│   ├── lib/                     # Utility libraries
│   │   ├── prisma.ts           # Prisma client
│   │   ├── gemini.ts           # Google Gemini client
│   │   ├── judge0.ts           # Judge0 API client
│   │   ├── local-executor.ts   # Local code execution
│   │   └── utils.ts            # Utility functions
│   │
│   ├── modules/                 # Feature modules
│   │   ├── auth/               # Authentication
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repo.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── token.service.ts
│   │   ├── exams/              # Exam management
│   │   ├── questions/          # Question management
│   │   ├── attempts/           # Exam attempts
│   │   ├── grading/            # Grading logic
│   │   ├── evaluations/        # Manual evaluations
│   │   ├── sections/           # Exam sections
│   │   ├── rubrics/            # Grading rubrics
│   │   ├── assets/             # File assets
│   │   └── ai/                 # AI question generation
│   │
│   └── types/                   # TypeScript types
│       └── express/            # Express type extensions
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
│
└── docs/                       # Additional documentation
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login**:
   - User submits email/password or uses Google OAuth
   - Backend validates credentials
   - Backend generates JWT access token (short-lived, e.g., 15 minutes)
   - Backend generates refresh token (long-lived, e.g., 7 days)
   - Refresh token stored in httpOnly cookie
   - Access token returned in response body

2. **Token Refresh**:
   - Frontend automatically refreshes access token using refresh token cookie
   - If refresh fails, user is logged out

3. **Request Authorization**:
   - Frontend includes access token in `Authorization: Bearer <token>` header
   - Backend middleware (`verifyAccess`) validates token
   - Backend middleware (`requireRole`) checks user role

### Roles

- **STUDENT**: Can take exams, view results
- **STAFF**: Can create exams, manage questions, grade submissions, view analytics

### Frontend Authentication

**AuthContext** (`frontend/context/AuthContext.tsx`):
- Manages user state and authentication
- Provides `login`, `loginWithGoogle`, `logout` functions
- Automatically refreshes tokens on app load
- Handles session expiration

**API Interceptor** (`frontend/lib/api.ts`):
- Automatically adds Authorization header to requests
- Handles 401 errors by attempting token refresh
- Logs out user if refresh fails

### Backend Authentication

**Middleware** (`backend/src/middleware/auth.ts`):
- `verifyAccess`: Validates JWT token and attaches user to request
- `requireRole(role)`: Ensures user has required role

**Token Service** (`backend/src/modules/auth/token.service.ts`):
- Generates access and refresh tokens
- Validates refresh tokens
- Manages token expiration

---

## Database Schema

### Key Models

#### User
- Stores user information (email, name, role, cohort info)
- Supports email/password and Google OAuth login
- Roles: STUDENT, STAFF

#### Exam
- Exam configuration (title, description, timing, duration)
- Status: DRAFT, PUBLISHED, CLOSED
- Timing modes: OVERALL_ONLY, PER_SECTION_ONLY, BOTH
- Section lock policies: NONE, LOCK_ON_COMPLETE, LINEAR_NO_BACKTRACK

#### Question
- Supports multiple question types (MCQ, CODING, ESSAY, etc.)
- Stores question data in JSON fields (options, testcases, etc.)
- Can be associated with rubrics for manual grading

#### Attempt
- Represents a student's exam attempt
- Tracks start time, submission time, status
- Stores score and time spent

#### Response
- Stores student's answer to a question
- Generic `answer` JSON field for flexibility
- Quick-access fields (chosenOptionIds, code, textAnswer) for common types
- Stores grading results (verdict, earnedPoints, feedback)

#### ExamAssignment
- Defines which students can take an exam
- Supports: assign to all, cohort-based, or individual student IDs

#### ExamSection
- Organizes questions into sections
- Supports section-specific timing and lock policies

### Relationships

```
User ──┬── Attempt ── Response ── Question
       │
       └── Evaluation (as assessor)

Exam ──┬── Question
       ├── ExamAssignment
       ├── ExamSection ── SectionQuestion ── Question
       └── Attempt
```

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/login
- **Auth**: Public
- **Body**: `{ email: string, password: string }`
- **Response**: `{ accessToken: string }`
- **Cookies**: Sets `refreshToken` httpOnly cookie

#### POST /api/auth/google/callback
- **Auth**: Public
- **Body**: `{ email, name, pictureUrl, googleId }`
- **Response**: `{ accessToken: string }`
- **Cookies**: Sets `refreshToken` httpOnly cookie

#### GET /api/me
- **Auth**: Bearer token required
- **Response**: User object

#### POST /api/auth/refresh
- **Auth**: Refresh token cookie required
- **Response**: `{ accessToken: string }`

#### POST /api/auth/logout
- **Auth**: Refresh token cookie (optional)
- **Response**: `{ message: string }`

### Exam Endpoints (Admin)

#### POST /api/admin/exams
- **Auth**: STAFF role required
- **Body**: Exam creation schema
- **Response**: Created exam object

#### GET /api/admin/exams
- **Auth**: STAFF role required
- **Query**: `page`, `pageSize`, `status`, `q` (search)
- **Response**: Paginated exam list

#### GET /api/admin/exams/:examId
- **Auth**: STAFF role required
- **Response**: Exam details with questions, sections, assignments

#### PATCH /api/admin/exams/:examId
- **Auth**: STAFF role required
- **Body**: Exam update schema
- **Response**: Updated exam object

#### POST /api/admin/exams/:examId/publish
- **Auth**: STAFF role required
- **Response**: Published exam object

#### POST /api/admin/exams/:examId/assign
- **Auth**: STAFF role required
- **Body**: Assignment schema (assignToAll, cohort, or studentIds)
- **Response**: Created assignment object

#### GET /api/admin/exams/:examId/submissions
- **Auth**: STAFF role required
- **Response**: List of exam submissions

#### GET /api/admin/exams/:examId/export
- **Auth**: STAFF role required
- **Response**: Excel file download

### Question Endpoints (Admin)

#### POST /api/admin/exams/:examId/questions
- **Auth**: STAFF role required
- **Body**: Bulk questions schema
- **Response**: Created questions

#### GET /api/admin/exams/:examId/questions
- **Auth**: STAFF role required
- **Response**: List of questions

#### PATCH /api/admin/questions/:questionId
- **Auth**: STAFF role required
- **Body**: Question update schema
- **Response**: Updated question

#### DELETE /api/admin/questions/:questionId
- **Auth**: STAFF role required
- **Response**: Success message

### Student Endpoints

#### GET /api/student/exams
- **Auth**: Bearer token required
- **Response**: List of available exams

#### GET /api/student/exams/:examId
- **Auth**: Bearer token required
- **Response**: Exam details (if assigned to student)

#### POST /api/student/exams/:examId/start
- **Auth**: Bearer token required
- **Response**: Created attempt object

#### GET /api/student/attempts/:attemptId
- **Auth**: Bearer token required
- **Response**: Attempt details with questions

#### GET /api/student/attempts/:attemptId/questions
- **Auth**: Bearer token required
- **Response**: List of questions for attempt

#### POST /api/student/attempts/:attemptId/answer
- **Auth**: Bearer token required
- **Body**: `{ questionId: string, answer: object }`
- **Response**: Updated response

#### POST /api/student/attempts/:attemptId/submit
- **Auth**: Bearer token required
- **Response**: Submitted attempt

#### GET /api/student/attempts/:attemptId/results
- **Auth**: Bearer token required
- **Response**: Exam results with grades

### Grading Endpoints (Admin)

#### POST /api/admin/attempts/:attemptId/grade
- **Auth**: STAFF role required
- **Body**: `{ questionId: string, score: number, feedback?: string }`
- **Response**: Updated evaluation

#### POST /api/admin/attempts/:attemptId/grade-all
- **Auth**: STAFF role required
- **Body**: Array of grading objects
- **Response**: Updated evaluations

### AI Endpoints (Admin)

#### POST /api/admin/ai/generate-questions
- **Auth**: STAFF role required
- **Body**: `{ examId, topic, questionTypes, counts, difficulty }`
- **Response**: Generated questions

### Section Endpoints (Admin)

#### POST /api/admin/exams/:examId/sections
- **Auth**: STAFF role required
- **Body**: Section creation schema
- **Response**: Created section

#### GET /api/admin/exams/:examId/sections
- **Auth**: STAFF role required
- **Response**: List of sections

#### PATCH /api/admin/sections/:sectionId
- **Auth**: STAFF role required
- **Body**: Section update schema
- **Response**: Updated section

#### POST /api/admin/sections/:sectionId/questions
- **Auth**: STAFF role required
- **Body**: `{ questionIds: string[] }`
- **Response**: Added questions to section

---

## Frontend Architecture

### Routing

Next.js App Router is used for routing. Routes are organized by role:

- `/admin/*` - Admin pages (protected by middleware)
- `/student/*` - Student pages (protected by middleware)
- `/login` - Login page (public)

### State Management

**AuthContext**: Global authentication state
- User information
- Access token
- Login/logout functions

**Local State**: React useState for component-specific state
- Form data
- UI state (modals, loading states)
- Exam data, questions, answers

### API Client

**Axios Instance** (`frontend/lib/api.ts`):
- Base URL configuration
- Request interceptors (adds Authorization header)
- Response interceptors (handles token refresh)
- Error handling

**Admin API Client** (`frontend/lib/api-admin.ts`):
- Admin-specific API functions
- Type-safe request/response handling

### Component Structure

**Page Components** (`app/*/page.tsx`):
- Main page components
- Handle data fetching
- Manage page-level state

**Feature Components** (`components/*/`):
- Reusable components for specific features
- Receive props, handle UI logic

**UI Components** (`components/ui/`):
- Generic, reusable UI components
- Button, Input, Modal, Toast

### Form Handling

**React Hook Form + Zod**:
- Form validation using Zod schemas
- Type-safe form data
- Error handling and display

### Code Editor

**Monaco Editor**:
- Used for coding questions
- Syntax highlighting
- Code completion
- Multiple language support

### Anti-Cheating Measures

**Fullscreen Mode**:
- Forces fullscreen when exam starts
- Warns if user exits fullscreen

**Tab Switching Detection**:
- Detects when user switches tabs
- Warns after 3 tab switches, auto-submits exam

**Keyboard Shortcuts Disabled**:
- Prevents F12, Ctrl+Shift+I/J, Ctrl+U
- Right-click disabled

---

## Backend Architecture

### Module Structure

Each module follows a consistent pattern:

```
module/
├── *.controller.ts    # Request handlers (HTTP layer)
├── *.service.ts       # Business logic
├── *.repo.ts          # Database operations
├── *.routes.ts        # Route definitions
└── *.zod.ts           # Validation schemas
```

### Request Flow

1. **Route** → Defines endpoint and middleware
2. **Controller** → Validates request, calls service
3. **Service** → Implements business logic, calls repository
4. **Repository** → Database operations using Prisma
5. **Response** → Returns data or error

### Error Handling

**Centralized Error Handler** (`backend/src/middleware/error.ts`):
- Catches all errors
- Formats error responses consistently
- Handles validation errors, authentication errors, etc.

**Error Format**:
```typescript
{
  status: number,
  message: string,
  error?: {
    message: string,
    issues?: ValidationError[]
  }
}
```

### Validation

**Zod Schemas** (`*.zod.ts`):
- Validates request body, query, params
- Type-safe validation
- Detailed error messages

**Validation Middleware** (`backend/src/middleware/validate.ts`):
- Applies Zod schemas to requests
- Returns 400 with validation errors if invalid

### Database Operations

**Prisma Client**:
- Type-safe database queries
- Automatic query optimization
- Transaction support

**Repository Pattern**:
- Separates database logic from business logic
- Makes testing easier
- Allows for easy database switching

### Code Execution

**Judge0 Integration** (`backend/src/lib/judge0.ts`):
- Submits code to Judge0 API
- Runs test cases
- Returns execution results

**Local Executor** (`backend/src/lib/local-executor.ts`):
- Fallback for local code execution
- Uses Docker or isolated environment

### AI Integration

**Google Gemini** (`backend/src/lib/gemini.ts`):
- Generates questions using AI
- Supports multiple question types
- Configurable difficulty levels

---

## Key Features & Flows

### Exam Creation Flow

1. Admin creates exam (title, description, timing, duration)
2. Admin adds questions (manual or AI-generated)
3. Admin organizes questions into sections (optional)
4. Admin assigns exam to students (all, cohort, or individual)
5. Admin publishes exam
6. Students can now start the exam

### Exam Taking Flow

1. Student views available exams
2. Student clicks "Start Exam"
3. System creates attempt record
4. System randomizes questions (if enabled)
5. Student answers questions
6. Answers are saved automatically (localStorage + API)
7. Student submits exam
8. System auto-grades MCQ and Coding questions
9. Staff manually grades Essay questions
10. Student views results

### Grading Flow

1. **Auto-grading** (MCQ, Coding):
   - MCQ: Compares chosen options with correct options
   - Coding: Runs test cases using Judge0 API
   - Calculates score based on test case results

2. **Manual Grading** (Essay):
   - Staff views submission
   - Staff grades using rubric (optional)
   - Staff provides feedback
   - Staff saves grade

### Question Generation Flow

1. Admin provides topic and question requirements
2. System sends request to Google Gemini API
3. AI generates questions based on requirements
4. System validates and formats questions
5. Questions are added to exam

---

## Development Setup

### Prerequisites

- Node.js 18+ (recommended 20)
- PostgreSQL database
- npm or yarn

### Backend Setup

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd ShadowCoders/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create `.env` file:
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/shadowcoders"
   DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/shadowcoders"
   JWT_SECRET="your-jwt-secret"
   FRONTEND_ORIGIN="http://localhost:3000"
   GOOGLE_API_KEY="your-google-api-key"
   JUDGE0_API_URL="https://ce.judge0.com"
   JUDGE0_API_KEY="your-judge0-api-key" # Optional
   JUDGE0_RAPIDAPI_HOST="judge0-ce.p.rapidapi.com" # Optional
   ```

4. **Setup database**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:4000/api"
   NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

### Database Setup

1. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE shadowcoders;
   ```

2. **Run migrations**:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

3. **Seed database (optional)**:
   ```bash
   npx prisma db seed
   ```

### Google OAuth Setup

1. **Create Google OAuth credentials**:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. **Configure frontend**:
   - Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to `.env.local`

### Judge0 Setup

1. **Option 1: Use free Judge0 API**:
   - No API key required
   - Rate limited

2. **Option 2: Use RapidAPI Judge0**:
   - Sign up for RapidAPI
   - Get API key
   - Add to backend `.env`

### Google Gemini Setup

1. **Get API key**:
   - Go to Google AI Studio
   - Create API key
   - Add to backend `.env`

---

## Environment Variables

### Backend (.env)

```env
# Server
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000

# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/shadowcoders"
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/shadowcoders"

# Authentication
JWT_SECRET="your-jwt-secret"

# AI
GOOGLE_API_KEY="your-google-api-key"

# Code Execution
JUDGE0_API_URL="https://ce.judge0.com"
JUDGE0_API_KEY="your-judge0-api-key" # Optional
JUDGE0_RAPIDAPI_HOST="judge0-ce.p.rapidapi.com" # Optional
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
```

---

## Code Organization Patterns

### Frontend Patterns

**Component Structure**:
```typescript
// Page component
export default function PageName() {
  // State
  const [data, setData] = useState();
  
  // Effects
  useEffect(() => {
    // Fetch data
  }, []);
  
  // Handlers
  const handleAction = async () => {
    // Handle action
  };
  
  // Render
  return <div>...</div>;
}
```

**API Calls**:
```typescript
// Using API client
const response = await api.get('/endpoint');
const data = response.data;

// Error handling
try {
  await api.post('/endpoint', data);
} catch (err: unknown) {
  const error = err as { response?: { data?: { error?: { message?: string } } } };
  console.error(error.response?.data?.error?.message);
}
```

**Form Handling**:
```typescript
// Using React Hook Form + Zod
const schema = z.object({
  field: z.string().min(1),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

const onSubmit = async (data: z.infer<typeof schema>) => {
  await api.post('/endpoint', data);
};
```

### Backend Patterns

**Controller Pattern**:
```typescript
export const controllerFunction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body; // Validated by middleware
    const result = await serviceFunction(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
```

**Service Pattern**:
```typescript
export const serviceFunction = async (input: InputType) => {
  // Business logic
  const result = await repoFunction(input);
  return result;
};
```

**Repository Pattern**:
```typescript
export const repoFunction = async (input: InputType) => {
  const result = await prisma.model.findMany({
    where: { ...input },
  });
  return result;
};
```

**Validation Pattern**:
```typescript
// Zod schema
export const schema = z.object({
  field: z.string().min(1),
});

// Route with validation
router.post('/endpoint',
  verifyAccess,
  requireRole('STAFF'),
  validate(schema),
  controllerFunction
);
```

---

## Testing

### Backend Testing

**Unit Tests**:
- Test services and repositories in isolation
- Mock database calls
- Test business logic

**Integration Tests**:
- Test API endpoints
- Test database operations
- Test authentication and authorization

### Frontend Testing

**Component Tests**:
- Test component rendering
- Test user interactions
- Test form validation

**E2E Tests**:
- Test complete user flows
- Test exam taking flow
- Test admin workflows

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

---

## Deployment

### Backend Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Environment Variables**:
   - Set all environment variables in production environment

3. **Database Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Start Server**:
   ```bash
   npm start
   ```

### Frontend Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Environment Variables**:
   - Set all `NEXT_PUBLIC_*` variables in deployment platform

3. **Deploy**:
   - Deploy to Vercel, Netlify, or other platform
   - Configure API URL and OAuth credentials

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] CORS settings updated
- [ ] API rate limiting configured
- [ ] Error logging configured
- [ ] Monitoring configured
- [ ] Backup strategy in place

---

## Troubleshooting

### Common Issues

#### Backend Issues

**Database Connection Error**:
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check database exists

**JWT Token Error**:
- Check JWT_SECRET is set
- Ensure tokens are not expired
- Check token format in requests

**Judge0 API Error**:
- Check API key is valid
- Check rate limits
- Verify Judge0 service is available

#### Frontend Issues

**API Connection Error**:
- Check NEXT_PUBLIC_API_URL is correct
- Ensure backend is running
- Check CORS settings

**Authentication Error**:
- Check tokens are being stored
- Verify refresh token flow
- Check cookie settings

**Build Errors**:
- Check TypeScript errors
- Verify all dependencies are installed
- Check environment variables

### Debugging

**Backend Debugging**:
- Enable debug logging
- Check server logs
- Use Postman/Insomnia to test API

**Frontend Debugging**:
- Use React DevTools
- Check browser console
- Use Network tab to inspect API calls

### Getting Help

- Check existing documentation
- Review error messages
- Check GitHub issues
- Contact development team

---

## Additional Resources

### Documentation Files

- `backend/README.md` - Backend setup and API overview
- `backend/BACKEND_DOCUMENTATION.md` - Detailed backend API documentation
- `frontend/README.md` - Frontend setup
- `GOOGLE_OAUTH_SETUP.md` - Google OAuth setup guide
- `JUDGE0_SETUP.md` - Judge0 setup guide

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com/)
- [Zod Documentation](https://zod.dev/)
- [Judge0 API Documentation](https://judge0.com/api)

---

## Conclusion

This documentation provides a comprehensive overview of the ShadowCoders platform. For specific implementation details, refer to the source code and inline comments. For questions or issues, please contact the development team.

**Last Updated**: 2024

