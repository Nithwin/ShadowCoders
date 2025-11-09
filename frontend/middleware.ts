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

  // 2. If user IS logged in (has refresh token)
  //    AND is trying to visit the login page...
  if (refreshToken && pathname === '/login') {
    // ...redirect them away from login to their dashboard.
    // We default to student; the client-side layout will fix it if they are staff.
    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }

  // 3. If none of the above, allow the request to continue
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