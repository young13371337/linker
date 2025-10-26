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
  // Если не указана аватарка, используем ссылку на SVG
  const defaultAvatarUrl = "https://resizer.mail.ru/p/2d3243c9-28a9-527c-acc4-3e7f19f4b8c6/AQAKlMFyyuDhk7ef5glIS3uLbMVw_UxiuoLDmcZmuZGDHmp4Ax7kyc2wMR_VHeCajjlDkRn4mE6Sr1xoII-N8OtKMfE.jpg";
  const user = await prisma.user.create({ data: { login, password: hash, avatar: defaultAvatarUrl } });
  return { id: user.id, login: user.login, avatar: user.avatar };
}
