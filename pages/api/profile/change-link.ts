import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user || !(session.user as any).id) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id;
  const { newLink } = req.body as { newLink?: string };
  if (!newLink || typeof newLink !== 'string') return res.status(400).json({ error: 'Invalid link' });
  const re = /^[A-Za-z0-9_]{3,32}$/;
  if (!re.test(newLink)) return res.status(400).json({ error: 'Invalid link format' });
  try {
    const existing = await prisma.user.findFirst({ where: { link: newLink } });
    if (existing && existing.id !== userId) return res.status(409).json({ error: 'Link is already taken' });
    const user = await prisma.user.update({ where: { id: userId }, data: { link: newLink } });
    const returned = {
      id: user.id,
      login: user.login,
      link: user.link || null,
      avatar: user.avatar || null,
      role: user.role || null,
      description: user.description || null,
      backgroundUrl: user.backgroundUrl || null,
      createdAt: user.createdAt,
    };
    return res.status(200).json({ user: returned });
  } catch (e: any) {
    console.error('/api/profile/change-link error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
