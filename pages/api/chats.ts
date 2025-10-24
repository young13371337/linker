                                                                                                                                                                                                                                                                      import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  let user = null;
  if (session && session.user?.id) {
    user = await prisma.user.findUnique({ where: { id: session.user.id } });
  } else if (session && session.user?.name) {
    user = await prisma.user.findUnique({ where: { login: session.user.name } });
  }
  console.log('API /api/chats: session.user', session.user);
  console.log('API /api/chats: resolved user', user);
  if (!session || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { name, userIds } = req.body;
    // Гарантируем, что название группы обязательно
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Название группы обязательно' });
    }
    // Гарантируем, что текущий пользователь всегда в группе
    let allUserIds = Array.isArray(userIds) ? [...userIds] : [];
    if (!allUserIds.includes(user.id)) {
      allUserIds.push(user.id);
    }
    if (allUserIds.length < 2) {
      return res.status(400).json({ error: 'Минимум 2 участника' });
    }
    // Создать чат и добавить пользователей
    const chat = await prisma.chat.create({
      data: {
        name: name,
        users: {
          connect: allUserIds.map((id: string) => ({ id }))
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
    // unreadCount можно получить отдельным запросом, если нужно
  const chatsWithUnread = chats.map((chat: any) => ({ ...chat }));
    console.log('API /api/chats: found chats for user', user.id, chatsWithUnread);
    return res.status(200).json({ chats: chatsWithUnread });
  }

  return res.status(405).end();
}
