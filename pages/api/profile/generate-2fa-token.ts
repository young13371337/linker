import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import prisma from "../../../lib/prisma";

function generateToken(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession({ req });
  if (!session || !session.user?.name) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const login = session.user.name;
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const newToken = generateToken(8);
  res.status(200).json({ token: newToken });
}
