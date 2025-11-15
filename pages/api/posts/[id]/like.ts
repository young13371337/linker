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
      // return updated counts and state to avoid extra queries on the client
      const likesCount = await (prisma as any).like.count({ where: { postId } });
      return res.status(200).json({ success: true, likeId: like.id, likesCount, likedByCurrentUser: true });
    } catch (e: any) {
      // unique constraint -> already liked - return idempotent success with current counts
      const msg = e?.message || String(e);
      console.warn('/api/posts/[id]/like POST error (already liked?)', msg);
      try {
        const likesCount = await (prisma as any).like.count({ where: { postId } });
        return res.status(200).json({ success: true, likeId: null, likesCount, likedByCurrentUser: true, note: 'Already liked' });
      } catch (e2) {
        return res.status(200).json({ success: true, likeId: null, likesCount: 0, likedByCurrentUser: true, note: 'Already liked' });
      }
    }
  }

  if (req.method === 'DELETE') {
    try {
      const existing = await (prisma as any).like.findUnique({ where: { postId_userId: { postId, userId } } });
      if (!existing) return res.status(404).json({ error: 'Not liked' });
      await (prisma as any).like.delete({ where: { id: existing.id } });
      const likesCount = await (prisma as any).like.count({ where: { postId } });
      return res.status(200).json({ success: true, likesCount, likedByCurrentUser: false });
    } catch (e) {
      console.error('/api/posts/[id]/like DELETE error', e);
      // Some DB errors can happen; return 200 as safe idempotent result if it seems to be already removed
      return res.status(500).json({ error: 'Internal error', detail: String((e as any)?.message || e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
