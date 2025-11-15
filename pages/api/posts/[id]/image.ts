import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

function detectMimeFromBuffer(buf: Buffer): string {
  if (!buf || buf.length < 12) return 'application/octet-stream';
  const s = buf.toString('ascii', 0, 12);
  if (s.startsWith('RIFF') && s.indexOf('WEBP') >= 8) return 'image/webp';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  return 'application/octet-stream';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).end();

  try {
    console.log('/api/posts/[id]/image: lookup post', { id });

    const mediaRows: any[] = await (prisma as any).$queryRaw`
      SELECT m.data as m_data, m.mime as m_mime FROM "Post" p
      LEFT JOIN "Media" m ON m.id = p."mediaId"
      WHERE p.id = ${id}
      LIMIT 1
    `;
    const mr = mediaRows?.[0] || null;

    if (mr?.m_data) {
      try {
        let buf = Buffer.isBuffer(mr.m_data) ? mr.m_data : Buffer.from(mr.m_data as any);
        const detected = detectMimeFromBuffer(buf);

        if (mr.m_mime !== detected) {
          console.warn('/api/posts/[id]/image: declared mime mismatch', { id, declared: mr.m_mime, detected });
          if ((process.env.AUTO_FIX_MEDIA_MIME || 'false').toLowerCase() === 'true') {
            try {
              await prisma.$executeRaw`UPDATE "Media" SET mime = ${detected} WHERE id = ${id}`;
            } catch {}
          }
        }

        const accept = String(req.headers.accept || '').toLowerCase();
        let outBuf = buf;
        let outMime = detected;

        if (detected === 'image/webp' && !accept.includes('image/webp')) {
          try {
            const sharpLib = (() => { try { return require('sharp'); } catch { return null; } })();
            if (sharpLib) {
              outBuf = await sharpLib(buf).toFormat('jpeg', { quality: 80 }).toBuffer();
              outMime = 'image/jpeg';
            }
          } catch {}
        }

        res.setHeader('Content-Type', outMime);
        res.setHeader('Content-Length', String(outBuf.length));
        return res.status(200).send(outBuf);
      } catch (e) {
        console.error('/api/posts/[id]/image: media buffer fail', e);
      }
    }

    // fallback — inline image
    try {
      const postRows: any[] = await (prisma as any).$queryRaw`
        SELECT p."imageData" as i_data, p."imageMime" as i_mime FROM "Post" p WHERE p.id = ${id} LIMIT 1
      `;
      const pr = postRows?.[0] || null;

      if (pr?.i_data) {
        try {
          let buf = Buffer.isBuffer(pr.i_data) ? pr.i_data : Buffer.from(pr.i_data as any);
          const detected = detectMimeFromBuffer(buf);

          if (pr.i_mime !== detected) {
            if ((process.env.AUTO_FIX_MEDIA_MIME || 'false').toLowerCase() === 'true') {
              try {
                await prisma.$executeRaw`UPDATE "Post" SET "imageMime" = ${detected} WHERE id = ${id}`;
              } catch {}
            }
          }

          const accept = String(req.headers.accept || '').toLowerCase();
          let outBuf = buf;
          let outMime = detected;

          if (detected === 'image/webp' && !accept.includes('image/webp')) {
            try {
              const sharpLib = (() => { try { return require('sharp'); } catch { return null; } })();
              if (sharpLib) {
                outBuf = await sharpLib(buf).toFormat('jpeg', { quality: 80 }).toBuffer();
                outMime = 'image/jpeg';
              }
            } catch {}
          }

          res.setHeader('Content-Type', outMime);
          res.setHeader('Content-Length', String(outBuf.length));
          return res.status(200).send(outBuf);
        } catch (e) {
          console.error('/api/posts/[id]/image: inline buffer fail', e);
        }
      }
    } catch {}

    return res.status(404).json({ error: 'Image not found for this post' });
  } catch (e) {
    console.error('/api/posts/[id]/image error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
