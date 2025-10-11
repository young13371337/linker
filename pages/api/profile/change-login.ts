import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { newLogin } = req.body;
  if (!newLogin || typeof newLogin !== 'string') {
    return res.status(400).json({ error: 'Invalid login' });
  }

  // Проверка, занят ли логин
  const existing = await prisma.user.findUnique({
    where: { login: newLogin },
  });
  if (existing) {
    return res.status(409).json({ error: 'Login is already taken' });
  }

  // Обновление логина
  await prisma.user.update({
    where: { id: session.user.id },
    data: { login: newLogin },
  });

  return res.status(200).json({ success: true });
}
