import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-revalidate-token");
  if (token !== process.env.STORE_REVALIDATE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paths } = await req.json();

    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json(
        { error: "paths array is required" },
        { status: 400 }
      );
    }

    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({ revalidated: true, paths });
  } catch (err) {
    console.error("Revalidate error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
