import { NextResponse } from 'next/server';

export function middleware(request: import('next/server').NextRequest) {
  try {
    const isAuth = request.cookies.get('next-auth.session-token') || request.cookies.get('next-auth.session');
    const path = request.nextUrl.pathname;

    // При заходе на корень "/" редиректим на /welcome
    if (path === '/') {
      return NextResponse.redirect(new URL('/welcome', request.url));
    }

    if (isAuth && path === '/welcome') {
      return NextResponse.redirect(new URL('/profile', request.url));
    }

    return NextResponse.next();
  } catch (e) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|public|styles|generated|prisma|dotnet-frontend).*)'],
};

/**
 * @param {import('next/server').NextRequest} request
 */
