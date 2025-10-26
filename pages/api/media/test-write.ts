import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const storageVoice = path.join(process.cwd(), 'storage', 'voice');
    const storageVideo = path.join(process.cwd(), 'storage', 'video');
    if (!fs.existsSync(storageVoice)) fs.mkdirSync(storageVoice, { recursive: true });
    if (!fs.existsSync(storageVideo)) fs.mkdirSync(storageVideo, { recursive: true });

    const voiceFile = path.join(storageVoice, `test-${Date.now()}.txt`);
    const videoFile = path.join(storageVideo, `test-${Date.now()}.txt`);
    await fs.promises.writeFile(voiceFile, 'voice test');
    await fs.promises.writeFile(videoFile, 'video test');

    return res.status(200).json({ ok: true, voiceFile: voiceFile.replace(process.cwd() + path.sep, ''), videoFile: videoFile.replace(process.cwd() + path.sep, '') });
  } catch (e: any) {
    console.error('[TEST WRITE] Error:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
