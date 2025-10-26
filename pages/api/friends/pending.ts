import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.name) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const login = String(session.user.name);
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) return res.status(401).json({ error: "user not found" });
  const userId = user.id;

  // Получаем входящие заявки в друзья
  const pendingRequests = await prisma.friendRequest.findMany({ where: { toId: userId } });
  res.status(200).json({ count: pendingRequests.length });
}
