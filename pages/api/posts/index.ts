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
    // default hasCol function - we may assign real checker inside DB query; keep defined so it can be used below
    let hasCol: (name: string) => boolean = (_name: string) => false;
    try {
      // Check whether `views` column exists before selecting it. This helps avoid P2010 errors
      const colRows: any[] = await (prisma as any).$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Post'`;
      const existingCols = new Set(colRows.map((c:any)=>String(c.column_name).toLowerCase()));
      const snake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
      hasCol = (name: string) => existingCols.has(name.toLowerCase()) || existingCols.has(snake(name));
      const includeViews = hasCol('views');
      const selectObj: any = {
        id: true,
        authorId: true,
        title: true,
        description: true,
        createdAt: true,
        media: { select: { id: true, mime: true, size: true, width: true, height: true, provider: true, key: true } },
        author: { select: { id: true, login: true, avatar: true, link: true } },
        likes: { select: { id: true } },
        // if likesCount column exists, include it
      };
      // Add optional image fields if available in the DB schema
      if (hasCol('imageSize')) selectObj.imageSize = true;
      if (hasCol('likesCount')) selectObj.likesCount = true;
      if (hasCol('imageMime')) selectObj.imageMime = true;
      if (hasCol('imageWidth')) selectObj.imageWidth = true;
      if (hasCol('imageHeight')) selectObj.imageHeight = true;
      if (includeViews) selectObj.views = true;
      posts = await (prisma as any).post.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: selectObj });
    } catch (fetchErr) {
      console.error('[API:/api/posts] DB error fetching posts, returning empty list as fallback', fetchErr);
      posts = [];
    }

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
        likesCount: hasCol('likesCount') ? String(p.likesCount || '0') : String(Array.isArray(likes) ? likes.length : 0),
        views: String(p.views || '0'),
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
