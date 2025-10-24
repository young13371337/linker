import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { file } = req.query;
  if (!file || Array.isArray(file)) {
    res.status(400).json({ error: 'No file specified' });
    return;
  }
  const filePath = path.join(process.cwd(), 'storage', 'voice', file);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename="${file}"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}
