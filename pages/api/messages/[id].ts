import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'No message id' });
  // Проверяем, что сообщение принадлежит пользователю
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg || msg.senderId !== session.user.id) return res.status(403).json({ error: 'Forbidden' });
  await prisma.message.delete({ where: { id } });
  return res.status(204).end();
}
