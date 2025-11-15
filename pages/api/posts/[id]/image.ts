import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).end();
  try {
    const post = await (prisma as any).post.findUnique({ where: { id }, include: { media: true } });
    console.log('/api/posts/[id]/image: lookup post', { id });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    // Serve inline image if present, otherwise serve connected media bytes
    if (post.imageData) {
      console.log('/api/posts/[id]/image: found inline image for post', { id, size: (post.imageData as Buffer).length, mime: post.imageMime });
      res.setHeader('Content-Type', post.imageMime || 'application/octet-stream');
      return res.status(200).send(post.imageData as Buffer);
    }
    if (post.media && (post.media as any).data) {
      console.log('/api/posts/[id]/image: found connected media for post', { id, size: ((post.media as any).data as Buffer).length, mime: (post.media as any).mime });
      res.setHeader('Content-Type', (post.media as any).mime || 'application/octet-stream');
      return res.status(200).send((post.media as any).data as Buffer);
    }
    return res.status(404).json({ error: 'Image not found for this post' });
  } catch (e) {
    console.error('/api/posts/[id]/image error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
