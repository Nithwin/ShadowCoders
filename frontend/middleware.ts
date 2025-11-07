import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const refreshToken = request.cookies.get('refreshToken');
    const {pathname} = request.nextUrl;

    // Redirect to login if no refresh token and accessing protected routes
    if(!refreshToken && (pathname.startsWith('/admin') || pathname.startsWith('/student'))) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If already logged in and trying to access login page, let the login page handle the redirect based on role
    // We don't redirect here because we need to check user role first
    if(refreshToken && pathname === '/login') {
        // Allow the page to load and handle role-based redirect
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/student/:path*', '/login'],
}