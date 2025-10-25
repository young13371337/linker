import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import path from 'path';
import fs from 'fs';

// Проверяем наличие папки .private_media
const mediaRoot = path.join(process.cwd(), '.private_media');
if (!fs.existsSync(mediaRoot)) {
  console.error('[DELETE MESSAGE] Error: .private_media folder not found');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[DELETE MESSAGE] Start handling delete request');
  
  if (req.method !== 'DELETE') {
    console.log('[DELETE MESSAGE] Wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    console.log('[DELETE MESSAGE] Unauthorized attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    console.log('[DELETE MESSAGE] Invalid message ID:', id);
    return res.status(400).json({ error: 'Invalid message ID' });
  }

  try {
    console.log('[DELETE MESSAGE] Looking for message:', id);
    const msg = await prisma.message.findUnique({ 
      where: { id },
      select: {
        id: true,
        senderId: true,
        audioUrl: true,
        videoUrl: true
      }
    });
    
    if (!msg) {
      console.log('[DELETE MESSAGE] Message not found:', id);
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (msg.senderId !== session.user.id) {
      console.log('[DELETE MESSAGE] Unauthorized delete attempt:', { 
        messageId: id, 
        requesterId: session.user.id,
        ownerId: msg.senderId 
      });
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Если у сообщения есть медиафайлы, пытаемся их удалить
    if (msg.audioUrl) {
      console.log('[DELETE MESSAGE] Attempting to delete audio file');
      try {
        const audioPath = msg.audioUrl.replace(/^\/api\/messages\/voice\//, '').replace(/^\/voice\//, '');
        const fullPath = require('path').join(process.cwd(), '.private_media', 'voice', audioPath);
        if (require('fs').existsSync(fullPath)) {
          require('fs').unlinkSync(fullPath);
          console.log('[DELETE MESSAGE] Audio file deleted:', fullPath);
        } else {
          console.log('[DELETE MESSAGE] Audio file not found:', fullPath);
        }
      } catch (e) {
        console.error('[DELETE MESSAGE] Error deleting audio file:', e);
      }
    }

    if (msg.videoUrl) {
      console.log('[DELETE MESSAGE] Attempting to delete video file');
      try {
        const videoPath = msg.videoUrl.replace(/^\//, '');
        const fullPath = require('path').join(process.cwd(), '.private_media', 'video', videoPath);
        if (require('fs').existsSync(fullPath)) {
          require('fs').unlinkSync(fullPath);
          console.log('[DELETE MESSAGE] Video file deleted:', fullPath);
        } else {
          console.log('[DELETE MESSAGE] Video file not found:', fullPath);
        }
      } catch (e) {
        console.error('[DELETE MESSAGE] Error deleting video file:', e);
      }
    }

    // Удаляем сообщение из базы данных после удаления файлов
    console.log('[DELETE MESSAGE] Deleting message from database:', id);
    await prisma.message.delete({ where: { id } });
    console.log('[DELETE MESSAGE] Message successfully deleted');
    
    return res.status(204).end();
    
  } catch (error) {
    console.error('Error in message deletion:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
