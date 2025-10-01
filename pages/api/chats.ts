                                                                                                                                                                                                                                                                      import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session || !session.user?.name) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const login = session.user.name;
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) return res.status(401).json({ error: 'user not found', login });

  if (req.method === 'POST') {
    const { name, userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length < 3) {
      return res.status(400).json({ error: 'Минимум 3 участника' });
    }
    // Создать чат и добавить пользователей
  const chat = await prisma.chat.create({
      data: {
        name: name || null,
        users: {
          connect: userIds.map((id: string) => ({ id }))
        }
      }
    });
    return res.status(200).json({ chat });
  }

  if (req.method === 'GET') {
    const { userIds } = req.query;
    if (userIds && typeof userIds === 'string') {
      const ids = userIds.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 2) {
          // Ищем личный чат между двумя пользователями
          let chat = await prisma.chat.findFirst({
            where: {
              users: {
                every: { id: { in: ids } },
                some: { id: { in: ids } }
              },
            },
            include: { users: true }
          });
          // Дополнительно проверяем, что в чате ровно два пользователя
          if (chat && chat.users.length !== 2) {
            chat = null;
          }
          if (!chat) {
            chat = await prisma.chat.create({
              data: {
                users: {
                  connect: ids.map(id => ({ id }))
                }
              },
              include: { users: true }
            });
          }
          return res.status(200).json({ chat });
      }
    }
    // Получить все чаты пользователя
    const chats = await prisma.chat.findMany({
      where: {
        users: {
          some: { id: user.id }
        }
      },
      include: {
        users: true
      }
    });
    return res.status(200).json({ chats });
  }

  return res.status(405).end();
}
