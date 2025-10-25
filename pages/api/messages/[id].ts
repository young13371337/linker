import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { decryptMessage } from '../../../lib/encryption';
import path from 'path';
import fs from 'fs';
import { pusher } from '../../../lib/pusher';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        chatId: true,
        text: true,
        audioUrl: true,
        videoUrl: true
      }
    });

    // Добавляем небольшую задержку
    await sleep(100);
    
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

    // Если у сообщения есть медиафайлы, пытаемся их удалить (без падений)
    const tryUnlink = async (fullPath: string) => {
      try {
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
          console.log('[DELETE MESSAGE] File deleted:', fullPath);
        } else {
          console.log('[DELETE MESSAGE] File not found (skip):', fullPath);
        }
      } catch (e) {
        console.error('[DELETE MESSAGE] Error deleting file:', fullPath, e);
      }
    };

    if (msg.audioUrl) {
      console.log('[DELETE MESSAGE] Attempting to delete audio file (safe)');
      const audioPath = msg.audioUrl.replace(/^\/api\/messages\/voice\//, '').replace(/^\/voice\//, '').replace(/^\//, '');
      const fullPath = path.join(process.cwd(), '.private_media', 'voice', audioPath || '');
      await tryUnlink(fullPath);
    }

    if (msg.videoUrl) {
      console.log('[DELETE MESSAGE] Attempting to delete video file (safe)');
      const videoPath = msg.videoUrl.replace(/^\//, '');
      const fullPath = path.join(process.cwd(), '.private_media', 'video', videoPath || '');
      await tryUnlink(fullPath);
    }

    // Пытаемся расшифровать сообщение для логов
    if (msg.text && msg.chatId) {
      try {
        const decryptedText = decryptMessage(msg.text, msg.chatId);
        console.log('[DELETE MESSAGE] Encrypted message content:', decryptedText);
      } catch (e) {
        console.error('[DELETE MESSAGE] Failed to decrypt message:', e);
      }
    }

    // Добавляем еще небольшую задержку перед удалением
    await sleep(100);

    // Удаляем сообщение из базы данных после удаления файлов
    console.log('[DELETE MESSAGE] Deleting message from database:', id);
    await prisma.message.delete({ where: { id } });
    console.log('[DELETE MESSAGE] Message successfully deleted');

    // Уведомляем подписчиков через Pusher
    try {
      if (msg.chatId) {
        await pusher.trigger(`chat-${msg.chatId}`, 'message-deleted', {
          messageId: id,
          chatId: msg.chatId,
          deletedBy: session.user.id
        });
        console.log('[DELETE MESSAGE] Pusher event sent for chat:', msg.chatId);
      }
    } catch (pErr) {
      console.error('[DELETE MESSAGE] Pusher trigger error:', pErr);
      // Не прерываем основной поток — удаление уже произошло
    }

    return res.status(204).end();
    
  } catch (error) {
    console.error('Error in message deletion:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
