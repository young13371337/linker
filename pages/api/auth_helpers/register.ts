import type { NextApiRequest, NextApiResponse } from "next";

// Placeholder file kept to satisfy some build-time references. The actual
// register logic lives in `lib/auth.ts` and is used by
// `pages/api/auth/register.ts`.

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(404).json({ error: "Not found" });
}
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";

export async function registerUser(login: string, password: string) {
  try {
    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) throw new Error("User already exists");
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { login, password: hash } });
    return { id: user.id, login: user.login };
  } catch (e: any) {
    // rethrow so API route can handle and map to HTTP status
    throw e;
  }
}
