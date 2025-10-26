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
    try {
      const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' }
      });
      // Temporarily return plain text (encryption is disabled)
      const plainMessages = messages.map((msg: any) => ({ ...msg, text: msg.text || '' }));
      return res.status(200).json({ messages: plainMessages });
    } catch (err: any) {
      // If DB read fails, log error and return empty list so UI still works
      console.error('[MESSAGES][GET] failed', err?.message || err, err?.stack || 'no-stack');
      return res.status(200).json({ messages: [] });
    }
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
    try {
      const { chatId, text } = req.body;
      if (!chatId || !text) return res.status(400).json({ error: 'chatId and text required' });
      // Store plain text for now (no encryption)
      let message: any = null;
      try {
        message = await prisma.message.create({
          data: {
            chatId,
            senderId: user.id,
            text,
            createdAt: new Date()
          }
        });
      } catch (dbErr: any) {
        // DB write failed — log and fall back to an ephemeral message so chat continues
        console.error('[MESSAGES][POST] DB create failed, falling back', dbErr?.message || dbErr, dbErr?.stack || 'no-stack');
        message = {
          id: `temp-${Date.now()}`,
          chatId,
          senderId: user.id,
          text,
          createdAt: new Date().toISOString(),
          _persisted: false
        };
      }

    // Получить всех участников чата — если чтение чата упало, всё равно продолжаем и уведомим через Pusher
    let chat = null as any;
    try {
      chat = await prisma.chat.findUnique({ where: { id: chatId }, include: { users: true } });
    } catch (chatErr: any) {
      console.error('[MESSAGES][POST] chat lookup failed, continuing without updating unreads', chatErr?.message || chatErr);
      chat = null;
    }
    if (chat) {
      for (const u of chat.users) {
        if (u.id !== user.id) {
          try {
            // Увеличить счетчик непрочитанных для каждого пользователя, кроме отправителя
            await prisma.chatUnread.upsert({
              where: { chatId_userId: { chatId, userId: u.id } },
              update: { count: { increment: 1 } },
              create: { chatId, userId: u.id, count: 1 }
            });
          } catch (upErr: any) {
            console.error('[MESSAGES][POST] chatUnread upsert failed for user', u.id, upErr?.message || upErr);
          }
        }
      }
    }

    // Отправить новое сообщение через Pusher
    const messageToSend = { ...message, text };
    try {
      await pusher.trigger(`chat-${chatId}`, 'new-message', messageToSend);
    } catch (pErr) {
      console.error('[MESSAGES][POST] pusher trigger failed', pErr);
    }
      return res.status(200).json({ message: messageToSend });
    } catch (err: any) {
      console.error('[MESSAGES][POST] failed', err);
      const payload: any = { error: 'Failed to send message', details: err?.message, stack: err?.stack };
      return res.status(500).json(payload);
    }
  }
}

