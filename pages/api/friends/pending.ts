import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getSession } from "next-auth/react";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session || !session.user?.name) {
    try {
      console.warn('[FRIENDS/PENDING] Unauthorized — missing session. Request cookies/header:', { cookieHeader: req.headers.cookie || null, host: req.headers.host || null });
    } catch (e) {
      console.warn('[FRIENDS/PENDING] Failed to log headers for unauthorized request', e);
    }
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
