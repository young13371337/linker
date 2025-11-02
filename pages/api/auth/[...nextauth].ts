




import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import prisma from "../../../lib/prisma";
import { createSessionRedis, deactivateOtherSessions, getSessionById } from '../../../lib/redis';
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
    credentials: {
  login: { label: "Login", type: "text" },
  password: { label: "Password", type: "password" },
  twoFactorCode: { label: "2FA Code", type: "text", optional: true }
    },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          console.error('No login or password provided');
          return null;
        }
        const user = await prisma.user.findUnique({ where: { login: credentials.login } });
        if (!user) {
          console.error('User not found:', credentials.login);
          return null;
        }
        // Сравниваем хэш пароля
        const bcrypt = require('bcryptjs');
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          console.error('Invalid password for user:', credentials.login);
          return null;
        }
        // Если у пользователя включена 2FA — проверяем TOTP код
        if (user.twoFactorEnabled) {
          const speakeasy = require('speakeasy');
          if (!credentials?.twoFactorCode) {
            console.error('2FA code required for user:', credentials.login);
            return null;
          }
          const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret || '',
            encoding: 'base32',
            token: credentials.twoFactorCode,
            window: 1
          });
          if (!verified) {
            console.error('Invalid 2FA code for user:', credentials.login);
            return null;
          }
        }
        // Получить user-agent из заголовка и IP
        let deviceName = '';
        let ip: string | null = null;
        if (typeof window === 'undefined' && credentials) {
          // next-auth передаёт req в authorize через this (context)
          // @ts-ignore
          const req = this && this.req;
          if (req && req.headers && req.headers['user-agent']) {
            deviceName = req.headers['user-agent'];
          }
          if (req) {
            ip = (req.headers && (req.headers['x-forwarded-for'] as string)) || (req.socket && req.socket.remoteAddress) || null;
          }
        }
  // Создаём новую сессию в Redis (с IP)
  const newSession = await createSessionRedis(user.id, deviceName, ip);
        // Завершаем все остальные сессии пользователя, кроме текущей
        await deactivateOtherSessions(user.id, newSession.id);
        // Если у пользователя нет 2FA, игнорируем credentials.twoFactorToken
  return { id: user.id, name: user.login, role: (user as any).role, avatar: (user as any).avatar, sessionId: newSession.id };
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    // session max age in seconds (4 minutes)
    maxAge: 4 * 60,
    // force token refresh on every session request so we can implement sliding expiry
    updateAge: 0,
  },
  jwt: {
    // when using JWT strategy, set jwt maxAge as well (4 minutes)
    maxAge: 4 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  callbacks: {
    async jwt({ token, user }: { token: any, user?: any }) {
      // On sign in, attach user fields including sessionId
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as any).role;
        token.avatar = (user as any).avatar;
        if ((user as any).sessionId) token.sessionId = (user as any).sessionId;
        return token;
      }
      // On subsequent requests, validate that the session still exists in Redis
      if (token && token.sessionId) {
        try {
          const s = await getSessionById(token.sessionId as string);
          if (!s || !s.isActive) {
            // invalidate token -> force sign out
            return {};
          }
        } catch (e) {
          return {};
        }
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.avatar = token.avatar;
        session.user.sessionId = token.sessionId;
      }
      return session;
    }
  }
};
export default NextAuth(authOptions);