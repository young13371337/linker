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

    // Проверить, есть ли уже чат между этими пользователями
    let chat = await prisma.chat.findFirst({
      where: {
        users: {
          every: { id: { in: [userId, requestId] } },
          some: { id: { in: [userId, requestId] } }
        }
      },
      include: { users: true }
    });
    if (!chat || chat.users.length !== 2) {
      // Создать чат только для этих двух пользователей
      chat = await prisma.chat.create({
        data: {
          users: {
            connect: [
              { id: userId },
              { id: requestId }
            ]
          }
        },
        include: { users: true }
      });
    }

    return res.status(200).json({ success: true, chat });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
