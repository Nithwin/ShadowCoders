import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function runs on every matched request
export function middleware(request: NextRequest) {
  // Get the refresh token from the user's cookies
  const refreshToken = request.cookies.get('refreshToken');
  const { pathname } = request.nextUrl;

  // --- Protection Logic ---

  // 1. If user is NOT logged in (no refresh token)
  //    AND is trying to access a protected portal...
  if (!refreshToken && (pathname.startsWith('/admin') || pathname.startsWith('/student'))) {
    // ...redirect them to the login page.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Allow all other requests to continue
  // Client-side components will handle role-based redirects
  return NextResponse.next();
}

// --- Config ---
// This config specifies which paths the middleware should run on.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};