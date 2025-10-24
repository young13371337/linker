
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { authenticator } from "otplib";
import type { Session } from "next-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!session || (!session.user?.id && !session.user?.login)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const where: any = session.user.id
    ? { id: session.user.id }
    : { login: session.user.login };
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: "Token required" });

  const user = await prisma.user.findUnique({ where });
  if (!user?.twoFactorSecret) return res.status(400).json({ error: "2FA not initialized" });

  const isValid = authenticator.check(token, user.twoFactorSecret);

  if (!isValid) return res.status(401).json({ error: "Invalid token" });

  try {
    await prisma.user.update({
      where,
      data: { twoFactorEnabled: true },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify 2FA" });
  }
}
