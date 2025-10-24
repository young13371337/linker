import type { NextApiRequest, NextApiResponse } from "next";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions as any);
  // @ts-ignore
  if (!session || !session.user?.name) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // @ts-ignore
  const login = session.user.name as string;
  const secret = speakeasy.generateSecret({
    name: `LinkerSocial (${login})`,
  });
  await prisma.user.update({
    where: { login },
    data: { twoFactorSecret: secret.base32 },
  });
  const qr = await QRCode.toDataURL(secret.otpauth_url!);
  return res.status(200).json({ qr, secret: secret.base32 });
}
