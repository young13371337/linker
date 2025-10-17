import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export const config = {
	api: {
		bodyParser: false,
	},
};

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
	return new Promise((resolve, reject) => {
	const { IncomingForm } = require('formidable');
	const form = new IncomingForm({ multiples: false, allowEmptyFiles: false, minFileSize: 1 });
		form.parse(req, (err: any, fields: any, files: any) => {
			if (err) reject(err);
			else resolve({ fields, files });
		});
	});
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
		   if (!audio) {
			   res.status(400).json({ error: 'No audio file', fields, files });
			   return;
		   }
		   // Проверка размера файла (минимум ~2КБ, что примерно соответствует 1 секунде mp3)
		   const audioSize = audio.size || (audio.filepath ? fs.statSync(audio.filepath).size : 0);
		   if (!audioSize || audioSize < 2048) {
			   res.status(400).json({ error: 'Audio file too short (min 1 секунда)', size: audioSize });
			   return;
		   }
		   const uploadDir = path.join(process.cwd(), 'storage', 'voice');
		   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
	   const fileName = `${Date.now()}-${audio.originalFilename ? audio.originalFilename.replace(/\.[^/.]+$/, '.mp3') : 'voice.mp3'}`;
	   const filePath = path.join(uploadDir, fileName);
	   fs.copyFileSync(audio.filepath || audio.path, filePath);
	   // Ссылка будет формироваться через API-роут, а не напрямую
	   const audioUrl = `/api/messages/voice/${fileName}`;
		// Сохраняем сообщение в БД
		let chatId = fields.chatId;
		if (Array.isArray(chatId)) chatId = chatId[0];
		// Получаем пользователя через next-auth
		const session = await getServerSession(req, res, authOptions);
		const userId = session?.user?.id;
		console.log('Parsed chatId:', chatId);
		console.log('NextAuth userId:', userId);
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
				audioUrl,
			},
		});
		res.status(200).json({ audioUrl, message });
	} catch (e) {
		console.error('Voice upload error:', e);
		res.status(500).json({ error: 'Upload failed', details: String(e) });
	}
}
