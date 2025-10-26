import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const users = await prisma.user.count();
    const chats = await prisma.chat.count();
      const messages = await prisma.message.count();
      return res.status(200).json({ ok: true, userCount: users, chatCount: chats, messageCount: messages });
  } catch (e: any) {
    console.error('[HEALTH-DB] Error connecting to DB:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e), stack: e?.stack });
  }
}
