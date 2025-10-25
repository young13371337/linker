import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end();
  
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'No message id' });

  try {
    const msg = await prisma.message.findUnique({ where: { id } });
    
    if (!msg) {
      console.log('Message not found:', id);
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (msg.senderId !== session.user.id) {
      console.log('Unauthorized delete attempt:', { 
        messageId: id, 
        requesterId: session.user.id,
        ownerId: msg.senderId 
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Если у сообщения есть медиафайлы, удаляем их
    if (msg.audioUrl) {
      try {
        const audioPath = msg.audioUrl.replace(/^\/api\/messages\/voice\//, '');
        const fullPath = require('path').join(process.cwd(), 'storage', 'voice', audioPath);
        require('fs').unlinkSync(fullPath);
      } catch (e) {
        console.error('Error deleting audio file:', e);
      }
    }

    if (msg.videoUrl) {
      try {
        const videoPath = msg.videoUrl.replace(/^\//, '');
        const fullPath = require('path').join(process.cwd(), 'storage', 'video', videoPath);
        require('fs').unlinkSync(fullPath);
      } catch (e) {
        console.error('Error deleting video file:', e);
      }
    }

    // Удаляем сообщение из базы данных после удаления файлов
    await prisma.message.delete({ where: { id } });
    return res.status(204).end();
    
  } catch (error) {
    console.error('Error in message deletion:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
