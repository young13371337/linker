import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { getStoragePath, ensureDir } from '../../../lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
  const storageVoice = getStoragePath('voice');
  const storageVideo = getStoragePath('video');
  if (!ensureDir(storageVoice)) throw new Error(`Unable to create storage dir: ${storageVoice}`);
  if (!ensureDir(storageVideo)) throw new Error(`Unable to create storage dir: ${storageVideo}`);

    const voiceFile = path.join(storageVoice, `test-${Date.now()}.txt`);
    const videoFile = path.join(storageVideo, `test-${Date.now()}.txt`);
    await fs.promises.writeFile(voiceFile, 'voice test');
    await fs.promises.writeFile(videoFile, 'video test');

  return res.status(200).json({ ok: true, voiceFile: voiceFile, videoFile: videoFile });
  } catch (e: any) {
    console.error('[TEST WRITE] Error:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
