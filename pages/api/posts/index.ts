import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = (await getServerSession(req, res, authOptions as any)) as any;
    const currentUserId = session?.user?.id || null;

    let posts: any[] = [];
    try {
      posts = await (prisma as any).post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      // Some Prisma client versions don't support `_count` in include; use explicit relation include
        select: {
          id: true,
          authorId: true,
          title: true,
          description: true,
          createdAt: true,
          imageSize: true,
          imageMime: true,
          imageWidth: true,
          imageHeight: true,
          media: { select: { id: true, mime: true, size: true, width: true, height: true, provider: true, key: true } },
          author: { select: { id: true, login: true, avatar: true, link: true } },
          likes: { select: { id: true } },
        },
      });
    } catch (fetchErr) {
      console.error('[API:/api/posts] DB error fetching posts, returning empty list as fallback', fetchErr);
      // fallback to empty posts to avoid 500 for clients if DB schema mismatch / migration not applied
      posts = [];
    }

    // Debug logging to help diagnose why posts may not appear in the UI.
    try {
      console.log('[API:/api/posts] fetched posts count=', Array.isArray(posts) ? posts.length : 'unknown');
      if (Array.isArray(posts) && posts.length > 0) console.log('[API:/api/posts] first post sample=', { id: posts[0].id, authorId: posts[0].authorId });
    } catch (e) { /* ignore logging errors */ }

    // If we have a current user, fetch which posts they've liked in one query
    let likedSet = new Set<string>();
    if (currentUserId && posts.length > 0) {
      try {
        const likes = await (prisma as any).like.findMany({ where: { userId: currentUserId, postId: { in: posts.map((p: any) => p.id) } }, select: { postId: true } });
        likes.forEach((l: any) => likedSet.add(l.postId));
      } catch (likeErr) {
        console.error('[API:/api/posts] error fetching likes; continuing without liked state', likeErr);
      }
    }

    const out = posts.map((p: any) => {
      const { likes, imageData, media, ...rest } = p;
      // remove binary fields from media if present
      let safeMedia = undefined as any;
      if (media) {
        const { data: _data, ...restMedia } = media;
        safeMedia = restMedia;
      }
      return {
        ...rest,
        media: safeMedia,
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
    // If an unexpected error happens, log it and return empty posts to avoid 500 on the frontend.
    return res.status(200).json({ posts: [] });
  }
}
