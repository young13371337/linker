import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { forbiddenPasswords } from "./forbidden-passwords";

export async function registerUser(login: string, password: string) {
  if (!login || !password) throw new Error("Login and password required");
  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) throw new Error("User already exists");
  if (forbiddenPasswords.includes(password)) {
    const err: any = new Error("Слишком простой пароль");
    err.code = "FORBIDDEN_PASSWORD";
    throw err;
  }
  const hash = await bcrypt.hash(password, 8); // ускоряем регистрацию
  const user = await prisma.user.create({ data: { login, password: hash } });
  return { id: user.id, login: user.login };
}
