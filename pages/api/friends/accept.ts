import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId, requestId } = req.body;
  if (!userId || !requestId) return res.status(400).json({ error: "userId and requestId required" });
  try {
    // Найти заявку
    const request = await prisma.friendRequest.findFirst({ where: { toId: userId, fromId: requestId } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    // Добавить в друзья обеим сторонам
    await prisma.friend.create({ data: { userId, friendId: requestId } });
    await prisma.friend.create({ data: { userId: requestId, friendId: userId } });
    // Удалить заявку
    await prisma.friendRequest.deleteMany({ where: { toId: userId, fromId: requestId } });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
