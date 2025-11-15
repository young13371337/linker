import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
export const config = { api: { bodyParser: false } };
import fs from 'fs';

// Robustly parse multipart data using a compatibility wrapper for `formidable` module shapes
async function parseForm(req: any) {
  return new Promise<{ fields: any; files: any }>((resolve, reject) => {
    try {
      const formidableLib = require('formidable');
      let createForm: any = null;
      if (typeof formidableLib === 'function') createForm = formidableLib;
      else if (formidableLib && typeof formidableLib.default === 'function') createForm = formidableLib.default;
      else if (formidableLib && typeof formidableLib.IncomingForm === 'function') createForm = (opts: any) => new formidableLib.IncomingForm(opts);
      if (!createForm) return reject(new Error('Formidable module has unexpected shape'));
      const form = createForm({ multiples: false, keepExtensions: true, maxFileSize: Number(process.env.MAX_FILE_BYTES || 25 * 1024 * 1024) });
      if (typeof form.parse === 'function') form.parse(req, (err: any, fields: any, files: any) => err ? reject(err) : resolve({ fields, files }));
      else if (typeof (form as any).then === 'function') (form as any).then((parsed: any) => resolve(parsed)).catch(reject);
      else reject(new Error('Formidable parse method not available'));
    } catch (err) { reject(err); }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user) return res.status(401).json({ error: 'Unauthorized' });

  let mediaId: string | undefined = undefined;
  let title: string | undefined = undefined;
  let description: string | undefined = undefined;
  let fileAny: any = undefined;
  if (req.headers && typeof req.headers['content-type'] === 'string' && req.headers['content-type'].startsWith('multipart/form-data')) {
    const parsed = await parseForm(req);
    const { fields, files } = parsed;
    // Debug: log incoming fields and file info for later diagnosis
    try { console.log('/api/posts/create multipart parsed fields:', Object.keys(fields).length ? fields : {}); } catch (e) {}
    try { console.log('/api/posts/create multipart files keys:', Object.keys(files || {})); } catch (e) {}
    // Formidable can parse fields as array when multiple values are present; coerce to string
    title = Array.isArray(fields.title) ? fields.title[0] : (typeof fields.title === 'string' ? fields.title : undefined);
    description = Array.isArray(fields.description) ? fields.description[0] : (typeof fields.description === 'string' ? fields.description : undefined);
    const fAny = (files?.file as any);
    // If file exists, log some metadata
    if (fAny) {
      try {
        const f = Array.isArray(fAny) ? fAny[0] : fAny;
        console.log('/api/posts/create multipart file info:', { name: f.originalFilename || f.newFilename || f.name, size: f.size, filepath: f.filepath || f.path || undefined });
      } catch (e) { /* ignore */ }
    }
    fileAny = Array.isArray(fAny) ? fAny[0] : fAny;
  } else if (req.headers && typeof req.headers['content-type'] === 'string' && req.headers['content-type'].startsWith('application/json')) {
    // Our `config` disables bodyParser for this route; parse JSON body manually
    const raw = await new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', (err) => reject(err));
    }).catch(() => '');
    if (raw) {
      try {
        const parsedBody = JSON.parse(raw);
        mediaId = parsedBody?.mediaId;
        title = typeof parsedBody?.title === 'string' ? parsedBody.title : undefined;
        description = typeof parsedBody?.description === 'string' ? parsedBody.description : undefined;
      } catch (e) { /* ignore malformed */ }
    }
  }

  try {
    console.log('/api/posts/create body', { body: req.body, userId: session.user.id });

    // If mediaId is provided, verify the media record exists before connecting.
    // This avoids failing the entire post creation when an upload unexpectedly
    // didn't persist a media record.
    let mediaConnect = undefined;
    let postImageCreate: any = undefined; // kept for backward compatibility fallback
    if (fileAny) {
      const filepath = (fileAny?.filepath || fileAny?.path) as string;
      if (filepath) {
        try {
          // prefer creating a Media DB record and attach to the post instead of inline fields
          let sharpLib: any = null;
          try { sharpLib = require('sharp'); } catch (e) { sharpLib = null; }
          let optimized: Buffer | null = null;
          let meta2: any = {};
          if (sharpLib) {
            optimized = await sharpLib(filepath).resize({ width: 1600, withoutEnlargement: true }).toFormat('webp', { quality: 80 }).toBuffer();
            meta2 = await sharpLib(optimized).metadata();
          } else {
            // sharp not available in this environment — fall back to raw bytes
            optimized = fs.readFileSync(filepath);
            meta2 = {};
          }
          try {
            const media = await (prisma as any).media.create({
              data: {
                ownerId: session.user.id,
                data: optimized as Buffer,
                mime: (fileAny && (fileAny.mimetype || fileAny.type)) || 'image/webp',
                size: (optimized as Buffer).length,
                width: meta2.width ?? undefined,
                height: meta2.height ?? undefined,
                provider: 'db',
              },
            });
            mediaConnect = { connect: { id: media.id } };
          } catch (err) {
            console.warn('/api/posts/create: failed to create media record for inline upload', String((err as any)?.message || err));
            // keep postImageCreate fallback for older schema migrations
            postImageCreate = {
              imageData: optimized as Buffer,
              photo: optimized as Buffer,
              imageMime: (fileAny && (fileAny.mimetype || fileAny.type)) || 'image/webp',
              imageSize: (optimized as Buffer).length,
              imageWidth: meta2.width ?? undefined,
              imageHeight: meta2.height ?? undefined,
            };
          }
          try { fs.unlinkSync(filepath); } catch (e) {}
        } catch (err) {
          console.warn('/api/posts/create: failed to process inline image', err);
        }
          try { fs.unlinkSync(filepath); } catch (e) {}
      }
    }
    if (mediaId && typeof mediaId === 'string') {
      try {
        const exists = await (prisma as any).media.findUnique({ where: { id: mediaId } });
        if (exists) mediaConnect = { connect: { id: mediaId } };
        else console.warn('/api/posts/create: provided mediaId not found, proceeding without media', { mediaId });
      } catch (e) {
        console.warn('/api/posts/create: error checking media existence', e);
      }
    }

    let post: any;
    try {
      console.log('/api/posts/create: creating post with data', { title, description, mediaId, hasInlineImage: !!postImageCreate, mediaConnect: !!mediaConnect });
      const createData: any = { authorId: session.user.id };
      if (typeof title === 'string' && title.length) createData.title = title;
      if (typeof description === 'string' && description.length) createData.description = description;
      // include media connection only when present
      if (mediaConnect) createData.media = mediaConnect;
      // do NOT include inline image fields into Post create; prefer `media` relation.
      // The fallback path below will create a Media record and connect it if needed.

      post = await (prisma as any).post.create({
        data: createData,
        include: { media: true, author: true },
      });
    } catch (err: any) {
      // If DB schema doesn't accept inline image fields (no migration), fallback to creating without inline image
      console.warn('/api/posts/create: inline image create failed, falling back to simple create', String(err?.message || err));
      // log fallback creation input for debugging
      console.log('/api/posts/create: fallback create with data', { title, description, mediaId });
      post = await (prisma as any).post.create({
        data: {
          authorId: session.user.id,
          title: typeof title === 'string' ? title : undefined,
          description: typeof description === 'string' ? description : undefined,
          media: mediaConnect,
        },
        include: { media: true, author: true },
      });
      // If we have inline image bytes but created fallback post, store image in Media table and connect
      if (postImageCreate && post) {
        try {
          const media = await (prisma as any).media.create({
            data: {
              ownerId: session.user.id,
              data: postImageCreate.imageData,
              mime: postImageCreate.imageMime,
              size: postImageCreate.imageSize,
              width: postImageCreate.imageWidth,
              height: postImageCreate.imageHeight,
              provider: 'db',
            },
          });
          await (prisma as any).post.update({ where: { id: post.id }, data: { media: { connect: { id: media.id } } } });
          console.log('/api/posts/create: created media fallback and connected to post', { mediaId: media.id, postId: post.id });
        } catch (e) { console.warn('/api/posts/create: fallback media create/connect failed', String((e as any)?.message || e)); }
      }
    }

    // Avoid sending raw inline image bytes back in the response (and binary media)
    if (post && (post as any).imageData) delete (post as any).imageData;
    if (post && post.media && (post.media as any).data) delete (post.media as any).data;
    console.log('/api/posts/create created post', { id: post.id, authorId: post.authorId, mediaId: post.mediaId, title: post.title, description: post.description, hasInlineImage: !!post.imageSize });
    return res.status(200).json({ post });
  } catch (e) {
    console.error('/api/posts/create error', e);
    return res.status(500).json({ error: 'Internal server error', detail: String((e as any)?.message || e) });
  }
}
