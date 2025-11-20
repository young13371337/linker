import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import createS3Client, { getS3Bucket } from '../../../lib/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'DELETE') {
    try {
      console.log('/api/posts/[id] DELETE requested for id=', id, 'by user=', session.user.id);
      // Use SQL queries (raw) to avoid Prisma P2022 errors when DB schema doesn't match client
      const rows: any[] = await (prisma as any).$queryRaw`
        SELECT p.id, p."authorId", p."mediaId", m.id as "m_id", m.provider as "m_provider", m.key as "m_key"
        FROM "Post" p
        LEFT JOIN "Media" m ON m.id = p."mediaId"
        WHERE p.id = ${id}
        LIMIT 1
      ` as any[];
      const post = rows && rows.length ? rows[0] : null;
      if (!post) return res.status(404).json({ error: 'Not found' });
      if (post.authorId !== session.user.id) return res.status(403).json({ error: 'Forbidden' });
      const mediaId = post.mediaId;
      const media = post.m_id ? { id: post.m_id, provider: post.m_provider, key: post.m_key } : null;

      // remove likes explicitly (cascade may already do it) to ensure DB consistency
      try {
        await (prisma as any).$executeRaw`DELETE FROM "Like" WHERE "postId" = ${id}`;
      } catch (delLikesErr) {
        console.warn('/api/posts/[id] DELETE: failed to delete likes for post', id, delLikesErr);
      }
      try {
        await (prisma as any).$executeRaw`DELETE FROM "Post" WHERE id = ${id}`;
      } catch (delPostErr) {
        console.error('/api/posts/[id] DELETE: failed to delete post', id, delPostErr);
        throw delPostErr;
      }

      // if media exists and not referenced by other posts, delete it as well
      if (mediaId) {
        try {
          const countRows: any[] = await (prisma as any).$queryRaw`SELECT COUNT(1) as cnt FROM "Post" WHERE "mediaId" = ${mediaId}`;
          const count = (countRows && countRows.length && Number(countRows[0].cnt)) || 0;
          if (count === 0) {
            if (media && media.provider && media.provider !== 'db') {
              const s3 = createS3Client();
              const bucket = getS3Bucket();
              try {
                if (s3 && bucket && media.key) {
                  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: media.key } as any));
                }
              } catch (s3err) {
                console.warn('/api/posts/[id] DELETE: failed to delete remote S3 media', s3err);
              }
            }
            // delete the media row via SQL to avoid Prisma schema mismatches
            try {
                // Check for `views` column and include it if present to avoid SQL errors on older DBs
                const colRows2: any[] = await (prisma as any).$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Post'`;
                const existingCols2 = new Set(colRows2.map((c:any)=>String(c.column_name).toLowerCase()));
                const snake2 = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
                const hasCol2 = (name: string) => existingCols2.has(name.toLowerCase()) || existingCols2.has(snake2(name));
                const includeViews2 = hasCol2('views');
              await (prisma as any).$executeRaw`DELETE FROM "Media" WHERE id = ${mediaId}`;
            } catch (medDelErr) {
              console.warn('/api/posts/[id] DELETE: failed to delete media row', medDelErr);
            }
          }
        } catch (medErr) {
          console.warn('/api/posts/[id] DELETE: media cleanup failed', medErr);
        }
      }
      return res.status(200).json({ success: true, deletedId: id });
    } catch (e) {
      return res.status(500).json({ error: 'Internal error', detail: String((e as any)?.message || e) });
    }
  }
  if (req.method === 'GET') {
    try {
            // Use raw SQL to avoid referencing missing columns in the DB (like imageData)
            const colRows2: any[] = await (prisma as any).$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Post'`;
            const existingCols2 = new Set(colRows2.map((c:any)=>c.column_name));
            const includeViews2 = existingCols2.has('views');
            const viewsFragment = includeViews2 ? 'p.views as views,' : '';
            const includeLikesCountCol = existingCols2.has('likescount') || existingCols2.has('likes_count') || existingCols2.has('likesCount');
            const likesCountFragment = includeLikesCountCol ? 'p."likesCount" as likesCount,' : '(SELECT COUNT(1) FROM "Like" l WHERE l."postId" = p.id) as likesCount,';
            const sql = `
         SELECT p.id, p."authorId", p.title, p.description, p."createdAt", p."mediaId",
           ${viewsFragment}
           u.login as u_login, u.avatar as u_avatar, u.link as u_link,
           m.id as m_id, m.mime as m_mime, m.size as m_size, m.width as m_width, m.height as m_height, m.provider as m_provider, m.key as m_key,
           ${likesCountFragment}
         FROM "Post" p
         LEFT JOIN "User" u ON u.id = p."authorId"
         LEFT JOIN "Media" m ON m.id = p."mediaId"
         WHERE p.id = ${id}
         LIMIT 1
            `;
            const rows: any[] = await (prisma as any).$queryRawUnsafe(sql);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const r = rows[0];
      let likedByCurrentUser = false;
      const session2 = session as any;
      const currentUserId = session2?.user?.id || null;
      if (currentUserId) {
        try {
          const lr: any[] = await (prisma as any).$queryRaw`SELECT 1 FROM "Like" l WHERE l."postId" = ${id} AND l."userId" = ${currentUserId} LIMIT 1`;
          likedByCurrentUser = !!(lr && lr.length);
        } catch (e) { /* ignore */ }
      }
      const postOut: any = {
        id: r.id,
        authorId: r.authorId,
        title: r.title,
        description: r.description,
        media: r.m_id ? { id: r.m_id, mime: r.m_mime, size: r.m_size, width: r.m_width, height: r.m_height, provider: r.m_provider, key: r.m_key } : null,
        author: { id: r.authorId, login: r.u_login, avatar: r.u_avatar, link: r.u_link },
        likesCount: String(r.likescount ?? r.likesCount ?? '0'),
        views: includeViews2 ? String(r.views || '0') : '0',
        likedByCurrentUser,
        createdAt: r.createdAt,
      };
      return res.status(200).json({ post: postOut });
    } catch (e) {
      console.error('/api/posts/[id] GET error', e);
      return res.status(500).json({ error: 'Internal error', detail: String((e as any)?.message || e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
