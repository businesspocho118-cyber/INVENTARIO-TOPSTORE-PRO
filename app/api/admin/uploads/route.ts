import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "edge";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const BUCKET = "product-images";
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://mwilpokulvssoomdytyk.supabase.co";

function safeFileName(fileName: string) {
  const extension = fileName.toLowerCase().endsWith(".png")
    ? ".png"
    : fileName.toLowerCase().endsWith(".gif")
      ? ".gif"
      : fileName.toLowerCase().endsWith(".webp")
        ? ".webp"
        : ".jpg";
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return `${Date.now()}-${baseName || "producto"}${extension}`;
}

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || fallback;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const productId = slugify(
      String(formData.get("product_id") || ""),
      "sin-producto"
    );
    const color = slugify(String(formData.get("color") || ""), "sin-color");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ninguna imagen" },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPG, PNG, WEBP o GIF." },
        { status: 400 }
      );
    }

    const fileName = safeFileName(file.name);
    const storagePath = `products/${productId}/${color}/${fileName}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, Buffer.from(bytes), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Error al subir la imagen al almacenamiento" },
        { status: 500 }
      );
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    return NextResponse.json({ path: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Error interno al subir la imagen" },
      { status: 500 }
    );
  }
}