import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.get('next-auth.session-token') || request.cookies.get('next-auth.session');
  const isWelcome = request.nextUrl.pathname === '/welcome';
  if (!isAuth && !isWelcome && request.nextUrl.pathname !== '/api/auth') {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|public|styles|generated|prisma|dotnet-frontend).*)'],
};
