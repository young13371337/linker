import { NextResponse } from 'next/server';

export function middleware(request: import('next/server').NextRequest) {
  try {
    const isAuth = request.cookies.get('next-auth.session-token') || request.cookies.get('next-auth.session');
    const path = request.nextUrl.pathname;

    // Главная страница теперь доступна всем, редирект убран

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
