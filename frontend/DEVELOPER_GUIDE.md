# Frontend Developer Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Setup](#development-setup)
4. [Next.js App Router](#nextjs-app-router)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Authentication](#authentication)
9. [Custom Hooks](#custom-hooks)
10. [Styling](#styling)
11. [Testing](#testing)
12. [Deployment](#deployment)

## Getting Started

### Prerequisites

- **Node.js**: 18+ (recommended 20+)
- **npm** or **yarn**: Package manager

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
# Create .env.local file (see Environment Variables)

# 3. Start development server
npm run dev
```

The application will start on `http://localhost:3000`

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin portal pages
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── attempts/
│   │   └── layout.tsx      # Admin layout
│   │
│   ├── student/            # Student portal pages
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── attempts/
│   │   └── layout.tsx      # Student layout
│   │
│   ├── login/              # Authentication
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
│
├── components/             # React Components
│   ├── admin/              # Admin components
│   │   ├── AdminHeader.tsx
│   │   ├── exam/
│   │   ├── question/
│   │   └── ...
│   │
│   ├── student/            # Student components
│   │   ├── exam/
│   │   ├── questions/
│   │   └── StudentHeader.tsx
│   │
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   │
│   ├── layout/             # Layout components
│   │   ├── AdminSidebar.tsx
│   │   └── StudentSidebar.tsx
│   │
│   ├── Landing/            # Landing page components
│   └── ErrorBoundary.tsx   # Error boundary component
│
├── hooks/                  # Custom React Hooks
│   ├── useExamSubmission.ts
│   ├── useAutoSave.ts
│   ├── useCheatingPrevention.ts
│   ├── useExamMonitoring.ts
│   └── ...
│
├── context/                # React Context
│   ├── AuthContext.tsx     # Authentication state
│   ├── ToastContext.tsx    # Toast notifications
│   └── ConfirmationContext.tsx # Confirmation dialogs
│
├── lib/                    # Utilities & Services
│   ├── api.ts              # Axios instance
│   ├── socket.ts           # Socket.IO client
│   └── google-auth.ts      # Google OAuth
│
├── utils/                  # Helper Functions
│   ├── answerFormatting.ts
│   ├── examCalculations.ts
│   ├── examDataUtils.ts
│   └── ...
│
├── types/                  # TypeScript Types
│   ├── exam.ts
│   └── index.ts
│
├── constants/              # Constants
│   └── index.ts
│
├── public/                 # Static Assets
│   ├── images/
│   ├── fonts/
│   └── videos/
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── proxy.ts                # Next.js proxy (replaces middleware)
└── README.md
```

## Development Setup

### Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api

# Google OAuth (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### Running the Development Server

```bash
# Standard development
npm run dev

# Local development (localhost only)
npm run dev:local

# Production build
npm run build
npm start
```

## Next.js App Router

### File-based Routing

```
app/
├── page.tsx              → / (Landing page)
├── login/
│   └── page.tsx          → /login
├── admin/
│   ├── layout.tsx        → Admin layout wrapper
│   ├── dashboard/
│   │   └── page.tsx      → /admin/dashboard
│   └── exams/
│       └── [examId]/
│           └── page.tsx  → /admin/exams/:examId
└── student/
    └── ...
```

### Layouts

Layouts wrap multiple pages and persist across navigation:

```typescript
// app/admin/layout.tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <AdminSidebar />
      <main>{children}</main>
    </div>
  );
}
```

### Server vs Client Components

By default, all components are Server Components. Use `'use client'` for Client Components:

```typescript
// Server Component (default)
export default function Page() {
  return <div>Static content</div>;
}

// Client Component
'use client';
import { useState } from 'react';

export default function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Component Architecture

### Component Hierarchy

```
Page Component (app/student/exams/page.tsx)
    ↓
Layout Component (components/layout/StudentSidebar.tsx)
    ↓
Feature Components (components/student/exam/*)
    ↓
UI Components (components/ui/*)
    ↓
Custom Hooks (hooks/*)
```

### Component Patterns

#### 1. Container/Presentational Pattern

```typescript
// Container Component (logic)
'use client';
export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const { data, isLoading } = useExams();
  
  return <ExamsList exams={data} loading={isLoading} />;
}

// Presentational Component (UI)
function ExamsList({ exams, loading }: Props) {
  if (loading) return <LoadingSpinner />;
  return (
    <div>
      {exams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
    </div>
  );
}
```

#### 2. Compound Components

```typescript
// Modal with Header, Body, Footer
<Modal>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button>Cancel</Button>
    <Button>Confirm</Button>
  </Modal.Footer>
</Modal>
```

#### 3. Render Props

```typescript
// Example: Data fetching component
<DataFetcher
  url="/api/exams"
  render={(data, loading, error) => (
    loading ? <Spinner /> : <ExamsList exams={data} />
  )}
/>
```

## State Management

### Local State (useState)

For component-specific state:

```typescript
const [count, setCount] = useState(0);
const [name, setName] = useState('');
```

### Shared State (Context API)

For global state across components:

```typescript
// Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage
const { user } = useAuth();
```

### Server State

For data from API:

```typescript
// Custom hook for fetching
function useExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.get('/student/exams').then(res => {
      setExams(res.data);
      setLoading(false);
    });
  }, []);
  
  return { exams, loading };
}
```

### Form State (React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' }
});

// In JSX
<form onSubmit={form.handleSubmit(onSubmit)}>
  <input {...form.register('email')} />
  {form.formState.errors.email && <span>Error</span>}
</form>
```

## API Integration

### Axios Instance

```typescript
// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// Usage
import { api } from '@/lib/api';

const response = await api.get('/student/exams');
const data = await api.post('/student/exams/:id/start', {});
```

### Request Interceptors

Automatic token refresh is handled in `lib/api.ts`:

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token automatically
      await api.post('/auth/refresh');
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Error Handling

```typescript
try {
  const response = await api.get('/student/exams');
  return response.data;
} catch (error) {
  if (error.response?.status === 401) {
    // Handle unauthorized
  } else if (error.response?.status === 404) {
    // Handle not found
  } else {
    // Handle other errors
  }
  throw error;
}
```

## Authentication

### Auth Context

```typescript
// Use authentication
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return <div>Welcome, {user?.name}</div>;
}
```

### Protected Routes

Using Next.js proxy (`proxy.ts`):

```typescript
// Automatically redirects unauthenticated users
export function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken');
  
  if (!refreshToken && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}
```

### Route Protection (Client-side)

```typescript
'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading]);
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return null;
  
  return <div>Protected content</div>;
}
```

## Custom Hooks

### useExamSubmission

```typescript
import { useExamSubmission } from '@/hooks/useExamSubmission';

const {
  isSubmitting,
  error,
  handleSubmitExam,
  setError
} = useExamSubmission(
  attempt,
  questions,
  answers,
  attemptId,
  clearLocalStorage,
  exitFullscreenRef,
  isFullscreenRef,
  confirmSubmit,
  emitActivityUpdate
);

// Usage
<button onClick={() => handleSubmitExam(false)}>
  Submit Exam
</button>
```

### useAutoSave

```typescript
import { useAutoSave } from '@/hooks/useAutoSave';

useAutoSave({
  attemptId,
  questions,
  answers,
  enabled: true,
  onSaveSuccess: (questionId) => {
    // Handle success
  },
  onSaveError: (questionId, error) => {
    // Handle error
  }
});
```

### useCheatingPrevention

```typescript
import { useCheatingPrevention } from '@/hooks/useCheatingPrevention';

const {
  warningCount,
  fullscreenWarning,
  setFullscreenWarning
} = useCheatingPrevention(attempt, handleAutoSubmit);
```

### Creating Custom Hooks

```typescript
// hooks/useCustomHook.ts
export function useCustomHook(dependency: string) {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Effect logic
  }, [dependency]);
  
  const action = useCallback(() => {
    // Action logic
  }, []);
  
  return { state, action };
}

// Usage
const { state, action } = useCustomHook('value');
```

## Styling

### Tailwind CSS

```typescript
// Utility classes
<div className="bg-blue-500 text-white p-4 rounded-lg">
  Content
</div>

// Responsive
<div className="w-full md:w-1/2 lg:w-1/3">
  Content
</div>

// Hover states
<button className="bg-blue-500 hover:bg-blue-600">
  Button
</button>
```

### CSS Modules (Alternative)

```typescript
// Component.module.css
.container {
  background: blue;
  padding: 1rem;
}

// Component.tsx
import styles from './Component.module.css';

<div className={styles.container}>Content</div>
```

### Custom Fonts

Fonts are configured in `app/layout.tsx`:

```typescript
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '600', '700'],
});

// Usage in Tailwind
<div className="font-poppins">Content</div>
```

## Testing

### Unit Tests (Future)

```typescript
// Component.test.tsx
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### E2E Tests (Future)

```typescript
// e2e/test.spec.ts
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/student/dashboard');
});
```

## Deployment

### Build for Production

```bash
# Build Next.js application
npm run build

# Start production server
npm start
```

### Environment Variables

Set production environment variables:
- `NEXT_PUBLIC_API_URL` (production API URL)
- `NEXT_PUBLIC_API_BASE_URL` (production API base URL)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (if using Google OAuth)

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Production Checklist

- [ ] Environment variables configured
- [ ] API URLs point to production
- [ ] Error boundaries implemented
- [ ] Loading states handled
- [ ] SEO metadata configured
- [ ] Analytics setup (future)
- [ ] Error logging configured (future)

## Best Practices

### Code Style

- Use TypeScript strict mode
- Follow React best practices
- Use functional components
- Extract reusable logic into hooks
- Keep components small and focused

### Performance

- Use `useMemo` for expensive calculations
- Use `useCallback` for function props
- Implement code splitting
- Optimize images (Next.js Image component)
- Lazy load components when possible (e.g., Monaco Editor, Recharts, xlsx)
- Use `next/dynamic` for heavy libraries
- Optimize images using Next.js `<Image/>` component

### Accessibility

- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers
- Maintain color contrast

## Troubleshooting

### Common Issues

1. **API Connection Error**
   - Check `NEXT_PUBLIC_API_URL` in `.env.local`
   - Verify backend is running
   - Check CORS configuration

2. **Authentication Issues**
   - Clear cookies and localStorage
   - Verify token is being set
   - Check refresh token logic

3. **Build Errors**
   - Clear `.next` directory
   - Delete `node_modules` and reinstall
   - Check TypeScript errors

4. **Hydration Errors**
   - Ensure server and client render same content
   - Use `suppressHydrationWarning` if necessary
   - Check for browser-only APIs in render

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Last Updated**: November 2024
**Version**: 1.0.0

