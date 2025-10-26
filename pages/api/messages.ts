import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { pusher } from '../../lib/pusher';
// Temporarily disable encryption to restore messaging quickly.
// Plaintext storage will be used until migrations/other issues are resolved.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  let user = null;
  if (session && session.user?.id) {
    user = await prisma.user.findUnique({ where: { id: session.user.id } });
  } else if (session && session.user?.name) {
    user = await prisma.user.findUnique({ where: { login: session.user.name } });
  }
  if (!session || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Получить сообщения по chatId
    const { chatId } = req.query;
    if (!chatId || typeof chatId !== 'string') return res.status(400).json({ error: 'chatId required' });
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });
    // Temporarily return plain text (encryption is disabled)
    const plainMessages = messages.map((msg: any) => ({ ...msg, text: msg.text || '' }));
    return res.status(200).json({ messages: plainMessages });
  }

  if (req.method === 'PUT') {
    const { chatId } = req.body;
    if (!chatId || typeof chatId !== 'string') return res.status(400).json({ error: 'chatId required' });
    await prisma.chatUnread.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { count: 0 },
      create: { chatId, userId: user.id, count: 0 }
    });
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'POST') {
    const { chatId, text } = req.body;
    if (!chatId || !text) return res.status(400).json({ error: 'chatId and text required' });
    // Store plain text for now (no encryption)
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: user.id,
        text,
        createdAt: new Date()
      }
    });

    // Получить всех участников чата
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { users: true }
    });
    if (chat) {
      for (const u of chat.users) {
        if (u.id !== user.id) {
          // Увеличить счетчик непрочитанных для каждого пользователя, кроме отправителя
          await prisma.chatUnread.upsert({
            where: { chatId_userId: { chatId, userId: u.id } },
            update: { count: { increment: 1 } },
            create: { chatId, userId: u.id, count: 1 }
          });
        }
      }
    }

    // Отправить новое сообщение через Pusher
  // Для Pusher и ответа расшифровываем текст
  const messageToSend = { ...message, text };
  await pusher.trigger(`chat-${chatId}`, 'new-message', messageToSend);
  return res.status(200).json({ message: messageToSend });
  }
}

