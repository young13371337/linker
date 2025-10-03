import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

// Модель сообщения: id, chatId, senderId, text, createdAt
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
    return res.status(200).json({ messages });
  }

  if (req.method === 'POST') {
    const { chatId, text } = req.body;
    if (!chatId || !text) return res.status(400).json({ error: 'chatId and text required' });
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: user.id,
        text,
        createdAt: new Date()
      }
    });
    return res.status(200).json({ message });
  }
}

