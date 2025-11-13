# ShadowCoders

A comprehensive online examination platform built with Next.js, Express, TypeScript, and PostgreSQL. Features multiple question types, automated grading, AI-powered question generation, and real-time code execution.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended 20+)
- **PostgreSQL** database (Supabase or Local PostgreSQL)
- **npm** or **yarn** package manager

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd ShadowCoders

# 2. Setup Backend
cd backend
npm install

# Option A: Local PostgreSQL (Recommended for Development)
npm run setup:local-db
npm run setup:admin

# Option B: Supabase (Cloud Database)
npm run setup:env
# Choose option 1 (Supabase) when prompted
npx prisma migrate deploy
npx prisma generate
npm run setup:admin

# 3. Start Backend
npm run dev

# 4. Setup Frontend (in a new terminal)
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
npm run dev
```

The backend will start on `http://localhost:4000` and frontend on `http://localhost:3000`

### Database Options

**Local PostgreSQL (Recommended for Development):**
- ✅ Works behind firewalls
- ✅ Faster (no network latency)
- ✅ Full control
- ✅ Offline development
- Setup: `npm run setup:local-db`

**Supabase (Cloud Database):**
- ✅ No installation required
- ✅ Managed database
- ✅ Good for production
- Setup: `npm run setup:env` (choose option 1)

**See [Local Database Setup Guide](./backend/docs/LOCAL_DATABASE_SETUP.md) for detailed instructions.**

## 📁 Project Structure

```
ShadowCoders/
├── backend/                 # Express API server
│   ├── src/                 # Source code
│   │   ├── config/          # Configuration
│   │   ├── middleware/      # Express middleware
│   │   ├── modules/         # Feature modules
│   │   ├── lib/             # Shared utilities
│   │   └── types/           # TypeScript types
│   ├── prisma/              # Database schema & migrations
│   ├── scripts/             # Utility scripts
│   └── README.md            # Backend documentation
│
├── frontend/                # Next.js application
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   ├── context/             # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Library utilities
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript types
│   └── README.md            # Frontend documentation
│
└── README.md                # This file
```

## 🏗️ Architecture

### Backend

- **Express.js** - RESTful API server
- **TypeScript** - Type-safe code
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Database (Supabase)
- **JWT** - Authentication
- **Zod** - Runtime validation
- **Judge0** - Code execution
- **Google Gemini** - AI question generation

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first CSS
- **Axios** - HTTP client
- **React Hook Form** - Form management
- **Monaco Editor** - Code editor
- **Zod** - Schema validation

## 📚 Features

### Authentication

- Email/password login
- Google OAuth
- JWT token-based authentication
- Role-based access control (Student, Staff)
- Automatic token refresh

### Exam Management

- Create and manage exams
- Multiple question types (MCQ, Coding, Essay)
- AI-powered question generation
- Assign exams to students
- Publish exams
- Export results to Excel

### Exam Taking

- Start exam attempts
- Answer questions
- Run code (Judge0 integration)
- Real-time timer
- Auto-save answers
- Fullscreen mode
- Submit exams

### Grading

- Automated grading (MCQ, Coding)
- Manual grading (Essay)
- Rubric-based grading
- View and review submissions
- Export results

### Code Execution

- Judge0 integration
- Multiple programming languages
- Test cases
- Queue system for concurrent executions
- Real-time feedback

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
FRONTEND_ORIGIN=http://localhost:3000
GOOGLE_API_KEY=your_google_api_key
JUDGE0_API_URL=https://ce.judge0.com
CODE_EXECUTION_PROVIDER=judge0
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## 🛠️ Available Scripts

### Backend

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run setup:env        # Interactive environment setup
npm run setup:admin      # Create admin user
npm run test:db          # Test database connection
npm run check:rls        # Check RLS status
```

### Frontend

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## 📖 Documentation

- [Backend Documentation](./backend/README.md) - Complete backend API documentation
- [Frontend Documentation](./frontend/README.md) - Frontend architecture and components
- [Exam Components](./frontend/docs/EXAM_COMPONENTS.md) - Exam component structure
- [Judge0 Integration](./frontend/docs/JUDGE0_INTEGRATION.md) - Judge0 integration guide

## 🔒 Security

- JWT authentication
- HTTP-only cookies for refresh tokens
- CORS configuration
- Role-based authorization
- Input validation with Zod
- SQL injection protection (Prisma)
- Password hashing (bcrypt)
- Row Level Security (RLS) on database

## 🧪 Testing

### Backend

```bash
# Health check
curl http://localhost:4000/api/healthz

# CORS test
curl -H "Origin: http://localhost:3000" http://localhost:4000/api/test-cors

# Database connection test
npm run test:db
```

### Frontend

```bash
# Start development server
npm run dev

# Test in browser
# Navigate to http://localhost:3000
```

## 🐛 Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` in `backend/.env`
- Check Supabase project status (should be active, not paused)
- Test connection: `npm run test:db`

### CORS Errors

- Ensure `FRONTEND_ORIGIN` is set correctly in `backend/.env`
- Restart backend after changing CORS settings
- Check browser console for CORS errors

### Authentication Issues

- Clear browser cookies and localStorage
- Check JWT token in browser DevTools
- Verify backend authentication endpoints
- Check token expiration

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support, please open an issue in the repository.
