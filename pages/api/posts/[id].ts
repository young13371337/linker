import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'DELETE') {
    try {
      console.log('/api/posts/[id] DELETE requested for id=', id, 'by user=', session.user.id);
      const post = await (prisma as any).post.findUnique({ where: { id } });
      if (!post) return res.status(404).json({ error: 'Not found' });
      if (post.authorId !== session.user.id) return res.status(403).json({ error: 'Forbidden' });
      await (prisma as any).post.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error('/api/posts/[id] DELETE error', e);
      return res.status(500).json({ error: 'Internal error', detail: String((e as any)?.message || e) });
    }
  }
  if (req.method === 'GET') {
    try {
      const post = await (prisma as any).post.findUnique({ where: { id }, include: { media: true, author: true } });
      if (!post) return res.status(404).json({ error: 'Not found' });
      // remove raw binary fields from the returned post
      const { imageData, media, ...rest } = post as any;
      let safeMedia = undefined as any;
      if (media) {
        const { data: _data, ...restMedia } = media;
        safeMedia = restMedia;
      }
      return res.status(200).json({ post: { ...rest, media: safeMedia } });
    } catch (e) {
      console.error('/api/posts/[id] GET error', e);
      return res.status(500).json({ error: 'Internal error', detail: String((e as any)?.message || e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
