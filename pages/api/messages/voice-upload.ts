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
		   let file, fileType, fileExt, uploadDir, fileName, filePath, urlField, urlValue;
		   if (audio) {
			   file = audio;
			   fileType = 'audio';
			   fileExt = '.mp3';
			   uploadDir = path.join(process.cwd(), 'storage', 'voice');
			   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
			   fileName = `${Date.now()}-${file.originalFilename ? file.originalFilename.replace(/\.[^/.]+$/, fileExt) : 'voice.mp3'}`;
			   filePath = path.join(uploadDir, fileName);
			   fs.copyFileSync(file.filepath || file.path, filePath);
			   urlField = 'audioUrl';
			   urlValue = `/api/messages/voice/${fileName}`;
		   } else {
			   res.status(400).json({ error: 'No audio file', fields, files });
			   return;
		   }
		   // Проверка размера файла (минимум ~2КБ)
		   const fileSize = file.size || (file.filepath ? fs.statSync(file.filepath).size : 0);
		   if (!fileSize || fileSize < 2048) {
			   res.status(400).json({ error: `${fileType} file too short (min 1 секунда)`, size: fileSize });
			   return;
		   }
		   let chatId = fields.chatId;
		   if (Array.isArray(chatId)) chatId = chatId[0];
		   const session = await getServerSession(req, res, authOptions);
		   const userId = session?.user?.id;
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
		   res.status(200).json({ [urlField]: urlValue, message });
	} catch (e) {
		console.error('Voice upload error:', e);
		res.status(500).json({ error: 'Upload failed', details: String(e) });
	}
}
