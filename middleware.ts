import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  try {
    const isAuth =
      request.cookies.get('next-auth.session-token') ||
      request.cookies.get('next-auth.session');

    const path = request.nextUrl.pathname;

    // Если пользователь не авторизован и заходит на корень сайта — редиректим на /auth/register
    if (path === '/' && !isAuth) {
      return NextResponse.redirect(new URL('/auth/register', request.url));
    }

    return NextResponse.next();
  } catch (e) {
    console.error('Middleware error:', e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico|public|styles|generated|prisma|dotnet-frontend).*)',
  ],
};
