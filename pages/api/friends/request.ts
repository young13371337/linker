import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId, friendId } = req.body;
  if (!userId || !friendId) return res.status(400).json({ error: "userId and friendId required" });
  // Проверка на существование заявки
  const existing = await prisma.friendRequest.findFirst({ where: { fromId: userId, toId: friendId } });
  if (existing) return res.status(400).json({ error: "Заявка уже отправлена." });
  await prisma.friendRequest.create({ data: { fromId: userId, toId: friendId } });
  return res.status(200).json({ ok: true });
}
