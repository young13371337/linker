import bcrypt from "bcryptjs";
import prisma from "./prisma";

export async function registerUser(login: string, password: string) {
  try {
    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) throw new Error("User already exists");
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { login, password: hash } });
    return { id: user.id, login: user.login };
  } catch (e: any) {
    throw e;
  }
}
