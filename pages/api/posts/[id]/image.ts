import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).end();
  try {
    const post = await (prisma as any).post.findUnique({ where: { id } });
    const post = await (prisma as any).post.findUnique({ where: { id } });
    console.log('/api/posts/[id]/image: lookup post', { id });
    res.setHeader('Content-Type', post.imageMime || 'application/octet-stream');
    console.log('/api/posts/[id]/image: found post with image', { id, size: (post.imageData as Buffer).length, mime: post.imageMime });
    res.setHeader('Content-Type', post.imageMime || 'application/octet-stream');
    return res.status(200).send(post.imageData as Buffer);
  } catch (e) {
    console.error('/api/posts/[id]/image error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
