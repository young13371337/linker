import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;

    // Allow auth pages so unauthenticated users can sign in / register
    if (path === '/auth/login' || path === '/auth/register') {
      return NextResponse.next();
    }

    // Allow public and Next.js internal assets (matcher excludes many, but keep safe)
    if (path.startsWith('/_next') || path.startsWith('/api') || path.startsWith('/public') || path === '/favicon.ico') {
      return NextResponse.next();
    }

    // Use next-auth jwt helper to read token from cookie or authorization header
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      // Not authenticated — redirect to login (no returnTo param to keep URL clean)
      const loginUrl = new URL('/auth/login', request.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated — allow
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
