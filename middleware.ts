import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Проверяем авторизацию через next-auth cookie
  const isAuth = request.cookies.get('next-auth.session-token') || request.cookies.get('next-auth.session');
  const isWelcome = request.nextUrl.pathname === '/welcome';
<<<<<<< HEAD
  if (!isAuth && !isWelcome && request.nextUrl.pathname !== '/auth/register') {
=======
  const isRegister = request.nextUrl.pathname === '/auth/register';
  const isLogin = request.nextUrl.pathname === '/auth/login';

  // Если авторизован, запрещаем доступ к /welcome
  if (isAuth && isWelcome) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }
  // Если не авторизован, разрешаем только /welcome, /auth/register, /auth/login
  if (!isAuth && !isWelcome && !isRegister && !isLogin) {
>>>>>>> e8aeb67 (Update and Host Linker)
    return NextResponse.redirect(new URL('/welcome', request.url));
  }
  // Все остальные случаи разрешаем
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|public|styles|generated|prisma|dotnet-frontend).*)'],
};

