# Backend Developer Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Setup](#development-setup)
4. [Module Architecture](#module-architecture)
5. [API Documentation](#api-documentation)
6. [Database Models](#database-models)
7. [Authentication & Authorization](#authentication--authorization)
8. [Error Handling](#error-handling)
9. [Code Execution](#code-execution)
10. [AI Integration](#ai-integration)
11. [Testing](#testing)
12. [Deployment](#deployment)

## Getting Started

### Prerequisites

- **Node.js**: 18+ (recommended 20+)
- **PostgreSQL**: Database server (Supabase recommended)
- **npm** or **yarn**: Package manager

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

## Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── cors.ts          # CORS configuration
│   │   └── env.ts           # Environment variables validation
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # JWT authentication & authorization
│   │   ├── error.ts         # Global error handler
│   │   └── validate.ts      # Zod request validation
│   │
│   ├── modules/             # Feature modules (MVC pattern)
│   │   ├── auth/            # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repo.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.zod.ts
│   │   │   └── token.service.ts
│   │   │
│   │   ├── exams/           # Exam management
│   │   ├── questions/       # Question management
│   │   ├── attempts/        # Exam attempts
│   │   ├── grading/         # Code execution & grading
│   │   ├── evaluations/     # Manual evaluations
│   │   ├── rubrics/         # Grading rubrics
│   │   ├── sections/        # Exam sections
│   │   ├── assets/          # Media assets
│   │   └── ai/              # AI question generation
│   │
│   ├── lib/                 # Shared utilities
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── cookie-utils.ts  # Cookie helpers
│   │   ├── judge0.ts        # Judge0 API integration
│   │   ├── local-executor.ts # Local code execution
│   │   ├── execution-queue.ts # Code execution queue
│   │   ├── gemini.ts        # Google Gemini AI
│   │   ├── db-health.ts     # Database health checks
│   │   ├── socket.ts        # Socket.IO setup
│   │   └── utils.ts         # General utilities
│   │
│   ├── types/               # TypeScript types
│   │   └── express/         # Express type extensions
│   │
│   ├── app.ts               # Express app configuration
│   └── index.ts             # Server entry point
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
│
├── scripts/                 # Utility scripts
│   ├── setup-env.js
│   ├── create-admin-user.js
│   ├── add-students.js
│   └── ...
│
├── uploads/                 # Uploaded files
├── package.json
├── tsconfig.json
└── README.md
```

## Development Setup

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"

# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET="your-secret-key-here"

# External Services
GOOGLE_API_KEY="your-google-api-key"
JUDGE0_API_KEY="your-judge0-api-key"  # Optional

# CORS
ALLOW_ALL_ORIGINS=true  # Development only
```

Use `npm run setup:env` for interactive setup.

### Database Setup

#### Using Supabase

1. Create a Supabase project
2. Get connection strings from Supabase dashboard
3. Set `DATABASE_URL` and `DIRECT_URL` in `.env`

#### Using Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database
3. Set `DATABASE_URL` in `.env`
4. `DIRECT_URL` is optional for local PostgreSQL

### Running Migrations

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Creating Admin User

```bash
# Interactive admin creation
npm run setup:admin

# Or use script directly
node scripts/create-admin-user.js
```

## Module Architecture

### MVC Pattern

Each module follows the MVC (Model-View-Controller) pattern:

```
Controller (Route Handler)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database (Prisma ORM)
```

### Module Structure

```typescript
// Example: auth module

// 1. Controller (auth.controller.ts)
export async function loginController(req: Request, res: Response) {
  try {
    const data = validate(loginSchema, req.body);
    const result = await authService.login(data);
    res.json(result);
  } catch (error) {
    next(error);  // Error middleware handles it
  }
}

// 2. Service (auth.service.ts)
export async function login(data: LoginInput) {
  // Business logic
  const user = await authRepo.findByEmail(data.email);
  if (!user || !await bcrypt.compare(data.password, user.password!)) {
    throw { status: 401, message: 'Invalid credentials' };
  }
  const tokens = await tokenService.generateTokens(user);
  return tokens;
}

// 3. Repository (auth.repo.ts)
export async function findByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { /* ... */ }
  });
}

// 4. Routes (auth.routes.ts)
export function registerAuthRoutes(app: Express) {
  const router = express.Router();
  router.post('/login', validate(loginSchema), loginController);
  app.use('/api/auth', router);
}

// 5. Validation Schema (auth.zod.ts)
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

### Creating a New Module

1. **Create module directory**: `src/modules/your-module/`
2. **Create files**:
   - `your-module.controller.ts` - Route handlers
   - `your-module.service.ts` - Business logic
   - `your-module.repo.ts` - Data access
   - `your-module.routes.ts` - Route definitions
   - `your-module.zod.ts` - Validation schemas
3. **Register routes** in `src/app.ts`:
   ```typescript
   import { registerYourModuleRoutes } from './modules/your-module/your-module.routes';
   registerYourModuleRoutes(app);
   ```

## API Documentation

### Request/Response Format

#### Success Response
```typescript
{
  data: T,
  meta?: {
    total: number,
    page: number,
    pageSize: number
  }
}
```

#### Error Response
```typescript
{
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### Endpoints

See `backend/README.md` for complete API documentation.

### Authentication

All authenticated endpoints require:
- **Header**: `Authorization: Bearer <access_token>`
- **Cookie**: `refreshToken` (for refresh endpoint)

### Request Validation

All POST/PUT requests are validated using Zod schemas:

```typescript
// In controller
const data = validate(loginSchema, req.body);

// Middleware automatically validates
router.post('/login', validate(loginSchema), loginController);
```

## Database Models

### Core Models

1. **User**: Students and Staff accounts
2. **Exam**: Exam definitions
3. **Question**: Questions of various types
4. **Section**: Exam sections
5. **Attempt**: Student exam attempts
6. **Response**: Student answers
7. **Evaluation**: Manual grading
8. **Rubric**: Grading rubrics
9. **Asset**: Media files

See `prisma/schema.prisma` for complete schema.

### Using Prisma Client

```typescript
import { prisma } from '../lib/prisma';

// Create
const user = await prisma.user.create({
  data: { email, password: hashed }
});

// Read
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// Update
const user = await prisma.user.update({
  where: { id: userId },
  data: { name: 'New Name' }
});

// Delete
await prisma.user.delete({
  where: { id: userId }
});

// Transactions
await prisma.$transaction([
  prisma.user.create({ data: user1 }),
  prisma.user.create({ data: user2 })
]);
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

## Authentication & Authorization

### JWT Tokens

- **Access Token**: Short-lived (15 minutes), sent in Authorization header
- **Refresh Token**: Long-lived (7 days), stored in HTTP-only cookie

### Authentication Flow

```typescript
// 1. Login
POST /api/auth/login
Body: { email, password }
Response: { accessToken, user }

// 2. Access protected endpoint
GET /api/student/exams
Header: Authorization: Bearer <access_token>

// 3. Refresh access token (if expired)
POST /api/auth/refresh
Cookie: refreshToken=<token>
Response: { accessToken }
```

### Authorization Middleware

```typescript
// Check authentication
router.get('/protected', verifyAccess, handler);

// Check role
router.get('/admin-only', verifyAccess, requireRole('STAFF'), handler);

// Check ownership
router.get('/my-resource/:id', verifyAccess, requireOwnership, handler);
```

### Custom Authorization

```typescript
// In service
export async function getAttempt(attemptId: string, userId: string) {
  const attempt = await attemptRepo.findById(attemptId);
  
  // Check ownership
  if (attempt.studentId !== userId) {
    throw { status: 403, message: 'Forbidden' };
  }
  
  return attempt;
}
```

## Error Handling

### Error Middleware

All errors are handled by the global error middleware (`src/middleware/error.ts`):

```typescript
// Throw structured error
throw {
  status: 400,
  code: 'VALIDATION_ERROR',
  message: 'Invalid input',
  details: { field: 'email', error: 'Invalid email format' }
};

// Error middleware converts to JSON response
{
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details: { field: 'email', error: 'Invalid email format' }
  }
}
```

### Error Types

```typescript
// Validation errors (400)
throw { status: 400, code: 'VALIDATION_ERROR', message: '...' };

// Authentication errors (401)
throw { status: 401, code: 'UNAUTHORIZED', message: '...' };

// Authorization errors (403)
throw { status: 403, code: 'FORBIDDEN', message: '...' };

// Not found errors (404)
throw { status: 404, code: 'NOT_FOUND', message: '...' };

// Server errors (500)
throw { status: 500, code: 'INTERNAL_ERROR', message: '...' };
```

### Database Error Handling

```typescript
try {
  await prisma.user.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    throw { status: 409, code: 'CONFLICT', message: 'Email already exists' };
  }
  throw error;
}
```

## Code Execution

### Judge0 Integration

```typescript
import { executeCode } from '../lib/judge0';

const result = await executeCode({
  code: 'print("Hello, World!")',
  language: 'python3',
  input: 'test input'
});
```

### Local Executor

```typescript
import { executeCodeLocally } from '../lib/local-executor';

const result = await executeCodeLocally({
  code: 'print("Hello")',
  language: 'python',
  input: ''
});
```

### Execution Queue

For rate limiting and better performance:

```typescript
import { executionQueue } from '../lib/execution-queue';

const result = await executionQueue.enqueue({
  code,
  language,
  input
});
```

## AI Integration

### Google Gemini AI

```typescript
import { generateJsonFromAi } from '../lib/gemini';

const questions = await generateJsonFromAi(
  'Generate 5 MCQ questions about JavaScript'
);
```

### AI Service

```typescript
// src/modules/ai/ai.service.ts
export async function generateQuestions(
  examId: string,
  prompt: string,
  count: number
) {
  const promptText = `Generate ${count} questions: ${prompt}`;
  const questions = await generateJsonFromAi(promptText);
  
  // Process and save questions
  return await questionService.createMany(examId, questions);
}
```

## Testing

### Unit Tests (Future)

```typescript
// Example test structure
describe('AuthService', () => {
  it('should login with valid credentials', async () => {
    const result = await authService.login({
      email: 'test@example.com',
      password: 'password'
    });
    expect(result.accessToken).toBeDefined();
  });
});
```

### Integration Tests (Future)

```typescript
// Test API endpoints
describe('POST /api/auth/login', () => {
  it('should return access token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
  });
});
```

## Deployment

### Build for Production

```bash
# Build TypeScript
npm run build

# Run migrations
npm run prisma:migrate

# Start server
npm start
```

### Environment Setup

Set production environment variables:
- `NODE_ENV=production`
- `DATABASE_URL` (production database)
- `JWT_SECRET` (strong secret)
- `ALLOW_ALL_ORIGINS=false`
- Set specific `CORS_ORIGINS`

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting enabled (future)
- [ ] Error logging configured (future)
- [ ] Monitoring setup (future)

## Best Practices

### Code Style

- Use TypeScript strict mode
- Follow MVC pattern
- Use async/await for async operations
- Handle errors properly
- Validate all inputs with Zod
- Use meaningful variable names

### Security

- Never commit `.env` files
- Hash passwords with bcrypt
- Use HTTP-only cookies for refresh tokens
- Validate all inputs
- Use parameterized queries (Prisma handles this)
- Set secure CORS headers

### Performance

- Use database indexes
- Implement pagination
- Use transactions for related operations
- Cache frequently accessed data (future)
- Optimize database queries

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check `DATABASE_URL` in `.env`
   - Verify database is running
   - Check network connectivity

2. **Migration Errors**
   - Run `npx prisma migrate reset` (CAUTION: deletes data)
   - Or manually fix migration conflicts

3. **JWT Errors**
   - Verify `JWT_SECRET` is set
   - Check token expiration
   - Verify token format

4. **CORS Errors**
   - Check `CORS_ORIGINS` in `.env`
   - Verify frontend URL is allowed
   - Check CORS middleware configuration

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Last Updated**: November 2024
**Version**: 1.0.0

