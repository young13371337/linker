import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import prisma from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'No id' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user.id;

  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return res.status(404).json({ error: 'Message not found' });

  // Check chat membership
  const chat = await prisma.chat.findUnique({ where: { id: message.chatId }, include: { users: true } });
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  const isMember = chat.users.some((u: any) => u.id === userId);
  if (!isMember) return res.status(403).json({ error: 'Forbidden' });

  if (!message.videoBase64) return res.status(404).json({ error: 'No video in message' });

  const mime = message.videoMime || 'video/webm';
  const buffer = Buffer.from(message.videoBase64, 'base64');
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', String(buffer.length));
  return res.status(200).send(buffer);
}
