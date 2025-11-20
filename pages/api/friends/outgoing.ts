import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user || !(session.user as any).id) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id;
  try {
    const outgoing = await prisma.friendRequest.findMany({ where: { fromId: userId }, select: { toId: true } });
    const toIds = Array.isArray(outgoing) ? outgoing.map((o: any) => o.toId) : [];
    return res.status(200).json({ toIds });
  } catch (e: any) {
    console.error('[API:/api/friends/outgoing] error:', e);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}
