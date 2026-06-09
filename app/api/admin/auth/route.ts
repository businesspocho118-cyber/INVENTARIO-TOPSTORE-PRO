import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, getCookieOptions } from "@/lib/auth";

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isRateLimited(ip: string): boolean {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return false;
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) return true;
  if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }
  return false;
}

function recordFailedAttempt(ip: string) {
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= 5) {
    attempt.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
  }
  loginAttempts.set(ip, attempt);
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  if (isRateLimited(ip)) {
    const attempt = loginAttempts.get(ip);
    const remainingMs = attempt ? attempt.lockedUntil - Date.now() : 0;
    const remainingMin = Math.ceil(remainingMs / 60000);
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta de nuevo en ${remainingMin} minutos.` },
      { status: 429 }
    );
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminUsername || !adminPasswordHash) {
      console.error("ADMIN_USERNAME or ADMIN_PASSWORD_HASH not set in environment");
      return NextResponse.json(
        { error: "Error de configuración del servidor" },
        { status: 500 }
      );
    }

    if (username !== adminUsername) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);

    if (!passwordMatch) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const token = await createSession(username);
    clearAttempts(ip);

    const response = NextResponse.json({ success: true });
    const cookieOptions = getCookieOptions();
    response.cookies.set({
      ...cookieOptions,
      value: token,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
