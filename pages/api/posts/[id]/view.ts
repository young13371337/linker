import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
      const cols: any[] = await (prisma as any).$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Post'`;
      const existingCols = new Set(cols.map((c:any)=>String(c.column_name).toLowerCase()));
      const snake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
      const hasCol = (name: string) => existingCols.has(name.toLowerCase()) || existingCols.has(snake(name));
      const includeViews = hasCol('views');
      if (!includeViews) {
        // Views column not available yet; return a safe response without updating the DB.
        return res.status(200).json({ success: true, views: '0', note: 'views column missing; run migration' });
      }
    // Fetch current views as string
    const rows: any[] = await (prisma as any).$queryRaw`
      SELECT p.views FROM "Post" p WHERE p.id = ${id} LIMIT 1
    ` as any[];
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const current = rows[0]?.views ?? '0';

    // If client provided a specific string value, we set it; otherwise increment numeric string
    let newViews = current;
    const body = req.body || {};
    if (body && typeof body.value === 'string' && body.value.length > 0) {
      newViews = body.value;
    } else {
      const num = Number.parseInt(String(current || '0'), 10);
      if (!Number.isNaN(num)) newViews = String(num + 1);
      else newViews = '1';
    }

    try {
      await (prisma as any).$executeRaw`UPDATE "Post" SET views = ${newViews} WHERE id = ${id}`;
    } catch (upErr) {
      console.error('/api/posts/[id]/view UPDATE failed', upErr);
      return res.status(500).json({ error: 'Failed to update views' });
    }
    return res.status(200).json({ success: true, views: newViews });
  } catch (e) {
    console.error('/api/posts/[id]/view error', e);
    return res.status(500).json({ error: 'Internal error', detail: String((e as any)?.message || e) });
  }
}
