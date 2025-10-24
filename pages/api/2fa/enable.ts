
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
  // Используем id если есть, иначе login
  const where: any = session.user.id
    ? { id: session.user.id }
    : { login: session.user.login };

  const secret = authenticator.generateSecret();

  try {
    await prisma.user.update({
      where,
      data: { twoFactorSecret: secret, twoFactorEnabled: false }
    });
    return res.status(200).json({ secret });
  } catch (error) {
    return res.status(500).json({ error: "Failed to enable 2FA" });
  }
}
