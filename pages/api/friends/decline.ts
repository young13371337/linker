import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  let { userId, requestId } = req.body as { userId?: string, requestId?: string };
  // Try to resolve current user from session if userId not provided
  if (!userId) {
    const session = await getServerSession(req, res, authOptions);
    if (session && session.user && (session.user as any).id) userId = (session.user as any).id;
  }
  if (!userId || !requestId) return res.status(400).json({ error: "userId and requestId required" });
  try {
    await prisma.friendRequest.deleteMany({ where: { toId: userId, fromId: requestId } });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
