import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { pusher } from '../../lib/pusher';
import { encryptMessage, decryptMessage } from '../../lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  let user = null;
  if (session && session.user?.id) {
    user = await prisma.user.findUnique({ where: { id: session.user.id } });
  } else if (session && session.user?.name) {
    user = await prisma.user.findUnique({ where: { login: session.user.name } });
  }
  if (!session || !user) {
    // Debug helper: log cookies/headers to help diagnose missing session in production/dev
    try {
      console.warn('[MESSAGES API] Unauthorized request — session missing. Request cookies/header:', {
        cookieHeader: req.headers.cookie || null,
        userAgent: req.headers['user-agent'] || null,
        host: req.headers.host || null,
      });
    } catch (e) {
      console.warn('[MESSAGES API] Failed to log headers for unauthorized request', e);
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Debug: log session and request method for easier diagnosis
  try {
    console.log('[MESSAGES API] method=', req.method, 'user=', { id: session.user?.id, name: session.user?.name });
  } catch (e) {
    console.error('[MESSAGES API] Failed to log session info', e);
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
      // Расшифровываем текст сообщений
      const decryptedMessages = messages.map((msg: any) => ({
        ...msg,
        text: msg.text ? decryptMessage(msg.text, chatId) : ''
      }));
      return res.status(200).json({ messages: decryptedMessages });
    } catch (err: any) {
      console.error('Failed to fetch messages for chatId', chatId, err);
      const payload: any = { error: 'Failed to fetch messages' };
      if (process.env.NODE_ENV !== 'production') {
        payload.details = err instanceof Error ? err.message : String(err);
        payload.stack = err instanceof Error && err.stack ? err.stack : undefined;
      }
      return res.status(500).json(payload);
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
    // Включаем CORS для быстрого ответа
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');

    const { chatId, text } = req.body || {};
    console.log('[MESSAGES API][POST] incoming body:', { chatId, text: typeof text === 'string' ? `${text.slice(0,80)}${text && text.length>80 ? '...':''}` : text });
    if (!chatId || typeof chatId !== 'string' || !text || typeof text !== 'string') {
      console.warn('[MESSAGES API][POST] bad request body');
      return res.status(400).json({ error: 'chatId and text required' });
    }

    try {
      // Ensure chat exists
      const chat = await prisma.chat.findUnique({ where: { id: chatId }, include: { users: true } });
      if (!chat) {
        console.warn('[MESSAGES API][POST] chat not found', chatId);
        return res.status(404).json({ error: 'Chat not found' });
      }

      // Шифруем сообщение (защищаем шифрование отдельным try)
      let encryptedText: string;
      try {
        encryptedText = encryptMessage(text, chatId);
      } catch (encErr: any) {
        console.error('[MESSAGES API][POST] encryptMessage failed', encErr);
        return res.status(500).json({ error: 'Encryption failed', details: String(encErr?.message || encErr) });
      }

      // Создаём сообщение в БД
      const message = await prisma.message.create({
        data: { chatId, senderId: user.id, text: encryptedText, createdAt: new Date() }
      });

      const messageToSend = { ...message, text };

      // Параллельно - обновления и pusher
      (async () => {
        try {
          const upserts = chat.users?.filter((u: any) => u.id !== user.id).map((u: any) => prisma.chatUnread.upsert({ where: { chatId_userId: { chatId, userId: u.id } }, update: { count: { increment: 1 } }, create: { chatId, userId: u.id, count: 1 } })) || [];
          await Promise.all([ Promise.all(upserts), pusher.trigger(`chat-${chatId}`, 'new-message', messageToSend) ]);
        } catch (bgErr) {
          console.error('[MESSAGES API][POST][BG] background error', bgErr);
        }
      })();

      return res.status(200).json({ message: messageToSend });
    } catch (error: any) {
      console.error('Message send error (top):', error);
      // Return details to help debugging (include stack) — remove/limit this in production when fixed
      return res.status(500).json({ error: 'Failed to send message', details: String(error?.message || error), stack: error?.stack });
    }
  }
}

