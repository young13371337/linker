import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query; // post id
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = session.user.id;
  const postId = String(id);

  if (req.method === 'POST') {
    // like
    try {
      const like = await (prisma as any).like.create({ data: { postId, userId } });
      return res.status(200).json({ success: true, likeId: like.id });
    } catch (e: any) {
      // unique constraint -> already liked
      const msg = e?.message || String(e);
      console.error('/api/posts/[id]/like POST error', msg);
      return res.status(409).json({ error: 'Already liked', detail: msg });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const existing = await (prisma as any).like.findUnique({ where: { postId_userId: { postId, userId } } });
      if (!existing) return res.status(404).json({ error: 'Not liked' });
      await (prisma as any).like.delete({ where: { id: existing.id } });
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error('/api/posts/[id]/like DELETE error', e);
      return res.status(500).json({ error: 'Internal error', detail: String((e as any)?.message || e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
