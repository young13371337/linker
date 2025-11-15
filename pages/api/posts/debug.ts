import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const posts = await (prisma as any).post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { media: true, author: true, likes: true },
    });
    return res.status(200).json({ posts });
  } catch (e) {
    console.error('[API:/api/posts/debug] error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
