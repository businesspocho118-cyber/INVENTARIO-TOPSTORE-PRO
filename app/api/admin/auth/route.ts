import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, getCookieOptions } from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);

    if (!passwordMatch) {
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
