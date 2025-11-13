# ShadowCoders Frontend

A modern Next.js 15 application built with React 19, TypeScript, and Tailwind CSS. Features a comprehensive online examination system with support for multiple question types, real-time code execution, and AI-powered question generation.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended 20+)
- **npm** or **yarn** package manager
- **Backend API** running on `http://localhost:4000`

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local file
cp .env.example .env.local

# 3. Configure environment variables
# Edit .env.local and set NEXT_PUBLIC_API_BASE_URL

# 4. Start development server
npm run dev
```

The application will start on `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── admin/                # Admin pages
│   │   ├── dashboard/        # Admin dashboard
│   │   ├── exams/            # Exam management
│   │   ├── attempts/         # View attempts
│   │   ├── submissions/      # View submissions
│   │   ├── review/           # Review submissions
│   │   ├── rubrics/          # Rubric management
│   │   └── profile/          # Admin profile
│   ├── student/              # Student pages
│   │   ├── dashboard/        # Student dashboard
│   │   ├── exams/            # Available exams
│   │   ├── attempts/         # Exam attempts
│   │   ├── results/          # Exam results
│   │   └── profile/          # Student profile
│   ├── login/                # Login page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   └── globals.css           # Global styles
├── components/               # React components
│   ├── admin/                # Admin components
│   │   ├── AdminHeader.tsx   # Admin header
│   │   ├── exam/             # Exam management components
│   │   ├── question/         # Question management components
│   │   └── GenerateAiQuestionsModal.tsx
│   ├── student/              # Student components
│   │   ├── StudentHeader.tsx # Student header
│   │   ├── exam/             # Exam-taking components
│   │   └── questions/        # Question components
│   ├── layout/               # Layout components
│   │   ├── AdminSidebar.tsx  # Admin sidebar
│   │   └── StudentSidebar.tsx # Student sidebar
│   ├── Landing/              # Landing page components
│   ├── ui/                   # UI components
│   │   ├── Button.tsx        # Button component
│   │   ├── Input.tsx         # Input component
│   │   ├── Modal.tsx         # Modal component
│   │   ├── Toast.tsx         # Toast notification
│   │   └── ConfirmationDialog.tsx
│   └── utils/                # Utility components
├── context/                  # React contexts
│   ├── AuthContext.tsx       # Authentication context
│   ├── ToastContext.tsx      # Toast notifications
│   └── ConfirmationContext.tsx
├── hooks/                    # Custom React hooks
│   ├── useAnswerManagement.ts
│   ├── useCheatingPrevention.ts
│   ├── useConfirmation.ts
│   ├── useExamAttemptData.ts
│   ├── useExamLocalStorage.ts
│   ├── useExamSubmission.ts
│   ├── useFullscreenManagement.ts
│   └── useToast.ts
├── lib/                      # Library utilities
│   ├── api.ts                # API client (axios)
│   ├── api-admin.ts          # Admin API client
│   └── google-auth.ts        # Google OAuth
├── utils/                    # Utility functions
│   ├── answerFormatting.ts
│   ├── examCalculations.ts
│   ├── examDataUtils.ts
│   ├── examQuestionUtils.ts
│   ├── examSectionUtils.ts
│   └── fullscreenUtils.ts
├── types/                    # TypeScript types
│   ├── exam.ts               # Exam types
│   └── index.ts              # Common types
├── constants/                # Constants
├── public/                   # Static assets
│   ├── fonts/                # Custom fonts
│   ├── images/               # Images
│   └── videos/               # Videos
├── docs/                     # Documentation
│   ├── EXAM_COMPONENTS.md    # Exam components documentation
│   └── JUDGE0_INTEGRATION.md # Judge0 integration guide
├── middleware.ts             # Next.js middleware
├── next.config.ts            # Next.js configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# API Configuration
# Backend API base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api

# Google OAuth (Optional)
# Get your credentials from: https://console.cloud.google.com/apis/credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 📚 Key Features

### Authentication

- **Email/Password Login** - Traditional login with email and password
- **Google OAuth** - Login with Google account
- **JWT Token Management** - Automatic token refresh
- **Role-based Access** - Different views for students and staff
- **Protected Routes** - Middleware-based route protection

### Exam Management (Admin)

- **Create Exams** - Create exams with multiple sections
- **Manage Questions** - Add, edit, delete questions
- **Question Types** - MCQ, Coding, Essay questions
- **AI Question Generation** - Generate questions using Google Gemini
- **Assign Exams** - Assign exams to specific students or all students
- **Publish Exams** - Publish exams for students to take
- **View Submissions** - View and review student submissions
- **Export Results** - Export exam results to Excel

### Exam Taking (Student)

- **View Available Exams** - List all available exams
- **Start Exam** - Start an exam attempt
- **Answer Questions** - Answer MCQ, coding, and essay questions
- **Run Code** - Test code against test cases (Judge0)
- **Timer** - Real-time exam timer
- **Auto-save** - Auto-save answers to localStorage
- **Fullscreen Mode** - Fullscreen requirement for exams
- **Submit Exam** - Submit exam for grading
- **View Results** - View exam results and scores

### Question Types

- **MCQ** - Multiple choice questions with single or multiple correct answers
- **Coding** - Coding questions with test cases and code execution
- **Essay** - Essay questions with word limit

### Code Execution

- **Judge0 Integration** - Execute code using Judge0 API
- **Multiple Languages** - Support for JavaScript, Python, Java, C++, etc.
- **Test Cases** - Run code against test cases
- **Queue System** - Manage concurrent code executions
- **Real-time Feedback** - Get immediate feedback on code execution

## 🛠️ Available Scripts

```bash
# Development
npm run dev        # Start development server with Turbopack
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## 🏗️ Architecture

### Next.js App Router

- **App Router** - Next.js 15 App Router with React Server Components
- **Server Components** - Server-side rendering for better performance
- **Client Components** - Client-side interactivity where needed
- **Route Protection** - Middleware-based route protection
- **API Integration** - Axios-based API client

### Component Structure

- **Page Components** - Route pages in `app/` directory
- **Feature Components** - Feature-specific components in `components/`
- **UI Components** - Reusable UI components in `components/ui/`
- **Layout Components** - Layout components in `components/layout/`

### State Management

- **React Context** - Context API for global state
- **React Hooks** - Custom hooks for reusable logic
- **Local Storage** - LocalStorage for persistent data
- **Server State** - Server state management with API calls

### Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Custom Fonts** - Custom fonts in `public/fonts/`
- **Responsive Design** - Mobile-first responsive design
- **Dark Mode** - Support for dark mode (future)

## 🔒 Security

- **JWT Authentication** - Token-based authentication
- **HTTP-only Cookies** - Secure cookie storage for refresh tokens
- **CORS Protection** - CORS configured on backend
- **Route Protection** - Middleware-based route protection
- **Input Validation** - Zod validation on frontend
- **XSS Protection** - React's built-in XSS protection

## 📝 Code Standards

- **TypeScript** - Strict TypeScript configuration
- **ESLint** - ESLint for code quality
- **Component Structure** - Consistent component structure
- **Naming Conventions** - camelCase for variables, PascalCase for components
- **Code Organization** - Feature-based code organization

## 🧪 Testing

### Development Testing

```bash
# Start development server
npm run dev

# Test in browser
# Navigate to http://localhost:3000
```

### API Integration

- **API Client** - Axios-based API client in `lib/api.ts`
- **Error Handling** - Centralized error handling
- **Token Refresh** - Automatic token refresh
- **Request Interceptors** - Request/response interceptors

## 🐛 Troubleshooting

### API Connection Issues

- Ensure backend is running on `http://localhost:4000`
- Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
- Check browser console for CORS errors
- Verify backend CORS configuration

### Authentication Issues

- Clear browser cookies and localStorage
- Check JWT token in browser DevTools
- Verify backend authentication endpoints
- Check token expiration

### Build Issues

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### TypeScript Errors

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Regenerate types
npm run build
```

## 📄 License

ISC
