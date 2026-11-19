import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, getCookieOptions } from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminUsername || (!adminPassword && !adminPasswordHash)) {
      console.error(
        "ADMIN_USERNAME and (ADMIN_PASSWORD or ADMIN_PASSWORD_HASH) must be configured in environment"
      );
      return NextResponse.json(
        { error: "Credenciales de administrador no configuradas en el servidor (.env)" },
        { status: 500 }
      );
    }

    if (username.trim() !== adminUsername.trim()) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    let passwordMatch = false;

    if (adminPassword) {
      passwordMatch = password === adminPassword;
    } else if (adminPasswordHash) {
      passwordMatch = await bcrypt.compare(password, adminPasswordHash);
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const token = await createSession(username.trim());

    const response = NextResponse.json({ success: true });
    const cookieOptions = getCookieOptions();
    response.cookies.set({
      ...cookieOptions,
      value: token,
    });

    return response;
  } catch (error) {
    console.error("Error en autenticación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
