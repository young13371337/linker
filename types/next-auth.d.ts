import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
  id: string;
  login?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  avatar?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
  id: string;
  login?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  avatar?: string | null;
  }
}
