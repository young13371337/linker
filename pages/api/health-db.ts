import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Run simple read queries to check DB connectivity and schema
    const userCount = await prisma.user.count();
    const chatCount = await prisma.chat.count();
    const messageCount = await prisma.message.count();
    return res.status(200).json({ ok: true, userCount, chatCount, messageCount });
  } catch (err: any) {
    console.error('[HEALTH-DB] failed', err?.message || err, err?.stack || 'no-stack');
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const users = await prisma.user.count();
    const chats = await prisma.chat.count();
    return res.status(200).json({ ok: true, users, chats });
  } catch (e: any) {
    console.error('[HEALTH-DB] Error connecting to DB:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e), stack: e?.stack });
  }
}
