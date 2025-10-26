import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { decryptMessage } from '../../../lib/encryption';
import path from 'path';
import fs from 'fs';
import { pusher } from '../../../lib/pusher';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Наши медиа сейчас хранятся в storage/{voice,video}
const mediaRoot = path.join(process.cwd(), 'storage');
if (!fs.existsSync(mediaRoot)) {
  console.error('[DELETE MESSAGE] Warning: storage folder not found');
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

    // Удаляем сообщение из базы данных сразу — это основная операция
    console.log('[DELETE MESSAGE] Deleting message from database:', id);
    let deleted;
    try {
      deleted = await prisma.message.delete({ where: { id } });
      console.log('[DELETE MESSAGE] Message successfully deleted from DB:', id);
    } catch (dbErr) {
      console.error('[DELETE MESSAGE] Prisma delete error:', dbErr);
      // Re-throw to be caught by outer catch and return 500
      throw dbErr;
    }

    // Файлы и Pusher выполняем в фоне — не блокируем ответ клиенту
    (async () => {
      try {
        const tryUnlink = async (fullPath: string) => {
          try {
            if (fs.existsSync(fullPath)) {
              await fs.promises.unlink(fullPath);
              console.log('[DELETE MESSAGE][BG] File deleted:', fullPath);
            } else {
              console.log('[DELETE MESSAGE][BG] File not found (skip):', fullPath);
            }
          } catch (e) {
            console.error('[DELETE MESSAGE][BG] Error deleting file:', fullPath, e);
          }
        };

        if (msg.audioUrl) {
          const audioFileName = path.basename(msg.audioUrl);
          const fullPath = path.join(process.cwd(), 'storage', 'voice', audioFileName || '');
          await tryUnlink(fullPath);
        }

        if (msg.videoUrl) {
          const videoFileName = path.basename(msg.videoUrl);
          const fullPath = path.join(process.cwd(), 'storage', 'video', videoFileName || '');
          await tryUnlink(fullPath);
        }

        // Уведомляем подписчиков через Pusher
        try {
          if (msg.chatId) {
            await pusher.trigger(`chat-${msg.chatId}`, 'message-deleted', {
              messageId: id,
              chatId: msg.chatId,
              deletedBy: session.user.id
            });
            console.log('[DELETE MESSAGE][BG] Pusher event sent for chat:', msg.chatId);
          }
        } catch (pErr) {
          console.error('[DELETE MESSAGE][BG] Pusher trigger error:', pErr);
        }
      } catch (bgErr) {
        console.error('[DELETE MESSAGE][BG] Background cleanup error:', bgErr);
      }
    })();

    return res.status(204).end();
    
  } catch (error) {
    console.error('Error in message deletion:', error);
    const payload: any = { error: 'Internal server error', details: error instanceof Error ? error.message : String(error), stack: error instanceof Error && error.stack ? error.stack : undefined };
    return res.status(500).json(payload);
  }
}
