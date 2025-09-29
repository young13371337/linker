import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { login } = req.query;
  if (!login || typeof login !== "string") return res.status(400).json({ error: "login required" });
  const user = await prisma.user.findUnique({ where: { login }, select: { id: true, login: true, avatar: true } });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.status(200).json({ user });
}
