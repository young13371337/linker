import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { encryptFileBuffer } from '../../../lib/encryption';
import { pusher } from '../../../lib/pusher';

export const config = {
	api: {
		bodyParser: false,
	},
};

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
	return new Promise((resolve, reject) => {
	const { IncomingForm } = require('formidable');
	const form = new IncomingForm({ 
		multiples: false, 
		allowEmptyFiles: false,
		keepExtensions: true,
		maxFileSize: 10 * 1024 * 1024, // 10MB максимум
		filter: function ({mimetype}: {mimetype?: string}) {
			return mimetype && mimetype.includes('audio');
		}
	});
	form.parse(req, (err: any, fields: any, files: any) => {
		if (err) reject(err);
		else resolve({ fields, files });
	});
	});
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Enable CORS for faster response
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST');
	
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	try {
		const { fields, files } = await parseForm(req);
		console.log('Voice upload fields:', fields);
		console.log('Voice upload files:', files);
		   let audio = files.audio;
		   if (Array.isArray(audio)) audio = audio[0];
		   let file, fileType, fileExt, uploadDir, fileName, filePath, urlField, urlValue;
		   let chatId = fields.chatId;
		   if (Array.isArray(chatId)) chatId = chatId[0];

           if (!chatId) {
               throw new Error('No chatId provided');
           }

		   if (audio) {
			   file = audio;
			   fileType = 'audio';
			   fileExt = '.mp3';
			   uploadDir = path.join(process.cwd(), '.private_media', 'voice');
			   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
			   fileName = `${Date.now()}-${file.originalFilename ? file.originalFilename.replace(/\.[^/.]+$/, fileExt) : 'voice.mp3'}`;
			   
			   try {
                   // Шифруем файл перед сохранением
                   filePath = path.join(uploadDir, fileName + '.enc');
                   console.log('[VOICE UPLOAD] filePath:', filePath);
                   
                   // Читаем файл через промисы
                   const fileBuffer = await fs.promises.readFile(file.filepath || file.path);
                   if (!fileBuffer || fileBuffer.length === 0) {
                       throw new Error('Empty file buffer');
                   }

                   // Отправляем частичный ответ клиенту пока идет шифрование
                   res.writeHead(202);
                   
                   const encryptedBuffer = encryptFileBuffer(fileBuffer, chatId);
                   
                   // Используем асинхронную запись файла
                   await fs.promises.writeFile(filePath, encryptedBuffer);
                   
                   urlField = 'audioUrl';
                   urlValue = `/api/media/voice/${fileName}.enc`;
                   console.log('[VOICE UPLOAD] urlValue:', urlValue, 'chatId:', chatId);
               } catch (error: any) {
                   console.error('[VOICE UPLOAD] Encryption error:', error);
                   throw new Error(`File encryption failed: ${error.message || 'Unknown error'}`);
               }
		   } else {
			   res.status(400).json({ error: 'No audio file', fields, files });
			   return;
		   }
		   // (Проверка минимального размера файла отключена)
		   let session = await getServerSession(req, res, authOptions);
		   let userId = session?.user?.id;
		   if (!chatId) {
			   res.status(400).json({ error: 'No chatId provided', fields });
			   return;
		   }
		   if (!userId) {
			   res.status(401).json({ error: 'Unauthorized: no userId from session', session });
			   return;
		   }
		   const message = await prisma.message.create({
			   data: {
				   chatId,
				   senderId: userId,
				   text: '',
				   [urlField]: urlValue,
			   },
		   });
		// Отправляем событие в Pusher
		try {
			await pusher.trigger(`chat-${chatId}`, 'new-message', {
				id: message.id,
				sender: userId,
				text: '',
				createdAt: message.createdAt,
				audioUrl: urlValue,
			});
		} catch (pErr) {
			console.error('[VOICE UPLOAD] Pusher trigger failed:', pErr);
		}
		res.status(200).json({ [urlField]: urlValue, message });
	} catch (e) {
		console.error('Voice upload error:', e);
		res.status(500).json({ error: 'Upload failed', details: String(e) });
	}
}
