import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  console.log('FRIENDS API session:', session);
  console.log('FRIENDS API login:', session?.user?.name);
  console.log('FRIENDS API headers:', req.headers);
  console.log('FRIENDS API cookies:', req.cookies);
  if (!session || !session.user?.email) {
    return res.status(401).json({
      error: 'Unauthorized',
      session,
      headers: req.headers,
      cookies: req.cookies
    });
  }
  if (typeof session.user.name !== 'string') return res.status(401).json({ error: 'session.user.name not string', session });
  const login = session.user.name;
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) return res.status(401).json({ error: 'user not found', login, session });
  const userId = user.id;

  // Получаем связи друзей
  const friends = await prisma.friend.findMany({ where: { userId } });
  const friendIds = friends.map((f: { friendId: string }) => f.friendId);
  // Получаем пользователей-друзей
  const friendUsers = await prisma.user.findMany({ where: { id: { in: friendIds } } });
  const result = friendUsers.map((u: { id: string; login: string }) => ({ id: u.id, name: u.login }));

  res.status(200).json({
    userId,
    login,
    friendsRaw: friends,
    friendIds,
    friendUsers,
    result
  });
}
