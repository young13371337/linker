import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { login, userId } = req.query;
  if (!login || typeof login !== "string") return res.status(400).json({ error: "login required" });
  const user = await prisma.user.findUnique({ where: { login }, select: { id: true, login: true, avatar: true, role: true } });
  if (!user) return res.status(404).json({ error: "User not found" });
  let isFriend = false;
  if (userId && typeof userId === "string" && userId !== user.id) {
    const friend = await prisma.friend.findFirst({ where: { userId, friendId: user.id } });
    isFriend = !!friend;
  }
  return res.status(200).json({ user: { ...user, isFriend } });
}
