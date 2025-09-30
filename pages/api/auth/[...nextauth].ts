




import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import prisma from "../../../lib/prisma";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
  login: { label: "Login", type: "text" },
  password: { label: "Password", type: "password" },
  twoFactorToken: { label: "2FA Token", type: "text", optional: true }
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
        if (user.password !== credentials.password) {
          console.error('Invalid password for user:', credentials.login);
          return null;
        }
        // Проверяем 2FA только если у пользователя она включена
        if (user.twoFactorToken && user.twoFactorToken.length > 0) {
          if (!credentials.twoFactorToken) {
            console.error('2FA token required for user:', credentials.login);
            return null;
          }
          if (user.twoFactorToken !== credentials.twoFactorToken) {
            console.error('Invalid 2FA token for user:', credentials.login);
            return null;
          }
        }
        // Если у пользователя нет 2FA, игнорируем credentials.twoFactorToken
        return { id: user.id, name: user.login };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    }
  }
});