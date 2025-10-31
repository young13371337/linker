import type { NextApiRequest, NextApiResponse } from "next";

// Placeholder file kept to satisfy some build-time references. The actual
// register logic lives in `lib/auth.ts` and is used by
// `pages/api/auth/register.ts`.

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(404).json({ error: "Not found" });
}
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";

export async function registerUser(login: string, password: string, link?: string) {
  try {
    if (!link || typeof link !== 'string') throw new Error('Link required');
    const re = /^[A-Za-z0-9_]{3,32}$/;
    if (!re.test(link)) throw new Error('Invalid link format');
    const existing = await prisma.user.findFirst({ where: { OR: [{ login }, { link }] } });
    if (existing) {
      if (existing.login === login) throw new Error("User already exists");
      throw new Error('Link already exists');
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { login, password: hash, link } });
    return { id: user.id, login: user.login, link: user.link };
  } catch (e: any) {
    // rethrow so API route can handle and map to HTTP status
    throw e;
  }
}
