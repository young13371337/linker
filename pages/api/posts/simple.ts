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
    const rows: any[] = await (prisma as any).$queryRaw`
      SELECT p.id, p."authorId", p.title, p.description, p."createdAt", p."mediaId",
             u.login, u.avatar, u.link,
             (SELECT COUNT(1) FROM "Like" l WHERE l."postId" = p.id) as "likesCount"
      FROM "Post" p
      LEFT JOIN "User" u ON u.id = p."authorId"
      ORDER BY p."createdAt" DESC
      LIMIT 50
    `;
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
    }));
    return res.status(200).json({ posts: out });
  } catch (e) {
    console.error('/api/posts/simple error', e);
    return res.status(200).json({ posts: [] });
  }
}
