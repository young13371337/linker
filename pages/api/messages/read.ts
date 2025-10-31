import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { decryptMessage } from '../../../lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions as any) as any;
  if (!session || !session.user || !session.user.id) return res.status(401).json({ error: 'Unauthorized' });
  const requesterId = session.user.id;

  const { messageId, userId } = req.body || {};
  if (!messageId || typeof messageId !== 'string') return res.status(400).json({ error: 'messageId required' });

  // If userId provided, ensure it matches session user id — we don't allow decrypting on behalf of others
  if (userId && userId !== requesterId) return res.status(403).json({ error: 'Cannot request decryption for another user' });

  try {
    const msg = await prisma.message.findUnique({ where: { id: messageId }, select: { id: true, chatId: true, senderId: true, text: true } });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    // Ensure requester is participant of the chat
    const chat = await prisma.chat.findUnique({ where: { id: msg.chatId }, include: { users: true } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const isParticipant = (chat.users || []).some((u: any) => u.id === requesterId);
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    // Decrypt using chatId-derived key
    const decrypted = msg.text ? decryptMessage(msg.text, msg.chatId) : '';
    return res.status(200).json({ messageId: msg.id, chatId: msg.chatId, text: decrypted, senderId: msg.senderId });
  } catch (e: any) {
    console.error('[MESSAGES/READ] error:', e);
    return res.status(500).json({ error: 'Internal server error', details: e?.message });
  }
}
