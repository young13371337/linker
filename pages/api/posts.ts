// Этот файл удалён. API для постов больше не существует.
import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

// Получить id текущего пользователя из localStorage (на сервере — из сессии, но для теста можно из body)
function getCurrentUserId(req: NextApiRequest): string | null {
  // В реальном проекте брать из авторизации, тут — из body или query
  if (req.method === 'POST') return req.body.userId || null;
  if (req.method === 'GET') return typeof req.query.userId === 'string' ? req.query.userId : null;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Получить userId для приоритета друзей
    const userId = getCurrentUserId(req);
    let posts = [];
    if (userId) {
      const friends = await prisma.friend.findMany({ where: { userId }, select: { friendId: true } });
      const friendIds = friends.map(f => f.friendId);
      // Получить посты с автором
      const friendPosts = await prisma.post.findMany({
        where: { authorId: { in: friendIds } },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, login: true, avatar: true, role: true } }
        },
      });
      const otherPosts = await prisma.post.findMany({
        where: { authorId: { notIn: friendIds } },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, login: true, avatar: true, role: true } }
        },
      });
      posts = [...friendPosts, ...otherPosts];
    } else {
      posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, login: true, avatar: true, role: true } }
        },
      });
    }
    res.status(200).json({ posts });
    return;
  }

  if (req.method === 'POST') {
    // Создать пост (требует userId, title, description)
    const { userId, title, description, photoUrl } = req.body;
    if (!userId || !title || !description) {
      res.status(400).json({ error: 'userId, title, description required' });
      return;
    }
    const post = await prisma.post.create({
      data: {
        authorId: userId,
        title,
        description,
        photoUrl,
      }
    });
    res.status(201).json({ post });
    return;
  }

  if (req.method === 'DELETE') {
    // Удалить пост (только если автор)
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'id required' });
      return;
    }
    // Получить пост
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    // Проверить авторство (userId из body или query)
    let userId = req.body?.userId;
    try {
      if (!userId && req.body) {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        userId = body?.userId;
      }
    } catch {}
    if (!userId) userId = req.query.userId;
    if (!userId || userId !== post.authorId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await prisma.post.delete({ where: { id } });
    res.status(200).json({ success: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}