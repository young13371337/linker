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

    const { chatId, text } = req.body;
    if (!chatId || !text) return res.status(400).json({ error: 'chatId and text required' });
    
    try {
      // Шифруем сообщение
      const encryptedText = encryptMessage(text, chatId);

      // Параллельные запросы для создания сообщения и получения участников чата
      const [message, chat] = await Promise.all([
        prisma.message.create({
          data: {
            chatId,
            senderId: user.id,
            text: encryptedText,
            createdAt: new Date()
          }
        }),
        prisma.chat.findUnique({
          where: { id: chatId },
          include: { users: true }
        })
      ]);

      // Формируем сообщение для отправки сразу
      const messageToSend = { ...message, text };

      // Параллельно обновляем счетчики и отправляем через Pusher
      Promise.all([
        // Обновление счетчиков непрочитанных сообщений
        chat?.users?.filter((u: any) => u.id !== user.id).map((u: any) => 
          prisma.chatUnread.upsert({
            where: { chatId_userId: { chatId, userId: u.id } },
            update: { count: { increment: 1 } },
            create: { chatId, userId: u.id, count: 1 }
          })
        ) || [],
        // Отправка через Pusher
        pusher.trigger(`chat-${chatId}`, 'new-message', messageToSend)
      ]).catch(error => {
        console.error('Background operations error:', error);
        // Не блокируем ответ при ошибках фоновых операций
      });

      // Быстрый ответ клиенту
      return res.status(200).json({ message: messageToSend });
    } catch (error: any) {
      console.error('Message send error:', error);
      return res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
  }
}

