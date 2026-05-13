import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  validateRegistrationInput,
  type RegistrationInput,
} from "@/lib/auth-registration";
import { prisma } from "@/lib/prisma";

const cookieName = "mihuo_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "local-development-secret-change-before-deploy",
);

export async function signIn(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  if (!user) {
    return { ok: false, message: "用户名或密码不正确" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, message: "用户名或密码不正确" };
  }

  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { ok: true };
}

export async function register(
  input: RegistrationInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const validation = validateRegistrationInput(input);
  if (!validation.ok) {
    return validation;
  }

  const existing = await prisma.user.findUnique({
    where: { username: validation.data.username },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, message: "这个用户名已经被注册了" };
  }

  const passwordHash = await bcrypt.hash(validation.data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: validation.data.username,
      displayName: validation.data.displayName,
      passwordHash,
    },
  });

  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { ok: true };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
  redirect("/login");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, secret);
    const userId = verified.payload.sub;
    if (!userId) {
      return null;
    }

    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    });
  } catch {
    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}
