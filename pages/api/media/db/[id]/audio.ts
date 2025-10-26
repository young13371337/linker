import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import prisma from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  // Cast to `any` to avoid strict TS inference issues in some build configs
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const message = await prisma.message.findUnique({ where: { id: String(id) } }) as any;
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Permission: sender or chat participant
    const userId = session.user.id as string;
    if (message.senderId !== userId) {
      const chat = await prisma.chat.findUnique({ where: { id: message.chatId }, include: { users: true } }) as any;
      const isParticipant = chat?.users?.some((u: any) => u.id === userId);
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
    }

    // Try several possible fields where base64 might be stored
    const b64 = message.audioBase64 || message.audio_base64 || message.audio || message.audio_data || message._audioBase64 || null;
    const mime = message.audioMime || message.audio_mime || message.audioMimeType || message.audio_mimetype || 'audio/webm';

    if (!b64) return res.status(404).json({ error: 'Audio not found in DB' });

    // Decode base64 and send
  const buffer = (globalThis as any).Buffer.from(b64, 'base64');
    res.setHeader('Content-Type', mime || 'audio/webm');
    res.setHeader('Content-Length', String(buffer.length));
    res.status(200).send(buffer);
  } catch (e: any) {
    console.error('[MEDIA][DB][AUDIO] Error serving DB audio:', e);
    return res.status(500).json({ error: 'Internal server error', details: String(e?.message || e) });
  }
}
