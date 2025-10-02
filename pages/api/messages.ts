import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getSession } from 'next-auth/react';

// Модель сообщения: id, chatId, senderId, text, createdAt
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'user not found', userId });

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

  return res.status(405).end();
}
