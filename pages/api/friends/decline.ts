import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId, requestId } = req.body;
  if (!userId || !requestId) return res.status(400).json({ error: "userId and requestId required" });
  try {
    await prisma.friendRequest.deleteMany({ where: { toId: userId, fromId: requestId } });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
