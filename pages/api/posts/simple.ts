import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const session = (await getServerSession(req, res, authOptions as any)) as any;
    const currentUserId = session?.user?.id || null;
    // Use raw SQL to avoid Prisma client schema mismatches in production.
    // Check whether the `views` column exists in the Post table. If not, don't select it.
    const cols: any[] = await (prisma as any).$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Post'
    `;
    const existing = new Set(cols.map((c: any) => String(c.column_name).toLowerCase()));
    const snake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
    const hasCol = (name: string) => existing.has(name.toLowerCase()) || existing.has(snake(name));
    const includeViews = hasCol('views');

    const viewsFragment = includeViews ? 'p.views as views,' : '';
    const sql = `
      SELECT p.id, p."authorId", p.title, p.description, p."createdAt", p."mediaId",
             ${viewsFragment}
             u.login, u.avatar, u.link,
             (SELECT COUNT(1) FROM "Like" l WHERE l."postId" = p.id) as "likesCount"
      FROM "Post" p
      LEFT JOIN "User" u ON u.id = p."authorId"
      ORDER BY p."createdAt" DESC
      LIMIT 50
    `;
    const rows: any[] = await (prisma as any).$queryRawUnsafe(sql);
    // Return minimal object list - the client will render placeholders where fields are missing
    // If currentUserId available, check which posts this user has liked
    let likedSet = new Set<string>();
    if (currentUserId && rows.length > 0) {
      try {
        const likes = await (prisma as any).like.findMany({ where: { userId: currentUserId, postId: { in: rows.map((p: any) => p.id) } }, select: { postId: true } });
        likes.forEach((l: any) => likedSet.add(l.postId));
      } catch (e) { /* ignore */ }
    }

    const out = rows.map((r: any) => ({
      id: r.id,
      authorId: r.authorId,
      title: r.title,
      description: r.description,
      media: r.mediaId ? { id: r.mediaId } : null,
      author: { id: r.authorId, login: r.login, avatar: r.avatar, link: r.link },
      likedByCurrentUser: !!(currentUserId && likedSet.has(r.id)),
      isOwner: !!(currentUserId && r.authorId === currentUserId),
      createdAt: r.createdAt,
      likesCount: Number(r.likesCount || 0),
      views: includeViews ? String(r.views || '0') : '0',
    }));
    return res.status(200).json({ posts: out });
  } catch (e) {
    console.error('/api/posts/simple error', e);
    return res.status(200).json({ posts: [] });
  }
}
