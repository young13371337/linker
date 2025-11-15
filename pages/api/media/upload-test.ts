import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  function parseForm(req: any) {
    return new Promise<{ fields: any; files: any }>((resolve, reject) => {
      try {
        const formidableLib = require('formidable');
        let createForm: any = null;
        if (typeof formidableLib === 'function') createForm = formidableLib;
        else if (formidableLib && typeof formidableLib.default === 'function') createForm = formidableLib.default;
        else if (formidableLib && typeof formidableLib.IncomingForm === 'function') createForm = (opts: any) => new formidableLib.IncomingForm(opts);
        if (!createForm) return reject(new Error('Formidable module has unexpected shape'));
        const form = createForm({ keepExtensions: true });
        if (typeof form.parse === 'function') {
          form.parse(req, (err2: any, fields: any, files: any) => (err2 ? reject(err2) : resolve({ fields, files })));
        } else if (typeof (form as any).then === 'function') {
          (form as any).then((parsed: any) => resolve(parsed)).catch(reject);
        } else reject(new Error('Formidable parse method not available'));
      } catch (err) { reject(err); }
    });
  }

  const { fields, files } = await parseForm(req);

    const fAny = (files.file as any);
    const file = Array.isArray(fAny) ? fAny[0] : fAny;
    if (!file) return res.status(400).json({ error: 'No file provided', files, fields });

    try {
      const filepath = (file.filepath || (file as any).path) as string;
      const dest = path.join(os.tmpdir(), `upload-test-${Date.now()}-${file.originalFilename || 'file'}`);
      await fs.promises.copyFile(filepath, dest);
      // return metadata
      return res.status(200).json({ savedTo: dest, originalFilename: file.originalFilename, size: file.size, fields });
    } catch (e) {
      console.error('upload-test error', e);
      return res.status(500).json({ error: 'Internal error', detail: String(e) });
    }
  
}
