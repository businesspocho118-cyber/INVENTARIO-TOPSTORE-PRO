import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
const COOKIE_NAME = "admin_token";
const SESSION_DURATION = "8h";

export async function createSession(username: string): Promise<string> {
  const token = await new SignJWT({ username, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(JWT_SECRET);
  return token;
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null };
  }
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export function getCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  };
}
