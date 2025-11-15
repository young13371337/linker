import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = (await getServerSession(req, res, authOptions as any)) as any;
    const currentUserId = session?.user?.id || null;

    const posts = await (prisma as any).post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      // Some Prisma client versions don't support `_count` in include; use explicit relation include
      include: {
        media: true,
        author: { select: { id: true, login: true, avatar: true, link: true } },
        likes: { select: { id: true } },
      },
    });

    // Debug logging to help diagnose why posts may not appear in the UI.
    try {
      console.log('[API:/api/posts] fetched posts count=', Array.isArray(posts) ? posts.length : 'unknown');
      if (Array.isArray(posts) && posts.length > 0) console.log('[API:/api/posts] first post sample=', { id: posts[0].id, authorId: posts[0].authorId });
    } catch (e) { /* ignore logging errors */ }

    // If we have a current user, fetch which posts they've liked in one query
    let likedSet = new Set<string>();
    if (currentUserId) {
      const likes = await (prisma as any).like.findMany({ where: { userId: currentUserId, postId: { in: posts.map((p: any) => p.id) } }, select: { postId: true } });
      likes.forEach((l: any) => likedSet.add(l.postId));
    }

    const out = posts.map((p: any) => {
      const { likes, imageData, ...rest } = p;
      return {
        ...rest,
        // don't send raw image data in list
        imageSize: p.imageSize,
        imageMime: p.imageMime,
        imageWidth: p.imageWidth,
        imageHeight: p.imageHeight,
        likesCount: Array.isArray(likes) ? likes.length : 0,
        likedByCurrentUser: !!(currentUserId && likedSet.has(p.id)),
        isOwner: !!(currentUserId && rest.author && rest.author.id === currentUserId),
      };
    });

    return res.status(200).json({ posts: out });
  } catch (e) {
    console.error('/api/posts error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
