import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (!msg.audioBase64) return res.status(404).json({ error: 'No audio stored' });
    const mime = msg.audioMime || 'audio/mpeg';
    const buffer = Buffer.from(msg.audioBase64, 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(buffer.length));
    return res.send(buffer);
  } catch (e: any) {
    console.error('[MEDIA][DB][AUDIO] Error serving:', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'Internal error', details: String(e) });
  }
}
