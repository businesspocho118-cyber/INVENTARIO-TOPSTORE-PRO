import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/[$,.]/g, "")) : value;
  if (isNaN(num)) return value as string;
  return `$${num.toLocaleString("es-CO")}`;
}

export function parseColors(colors: string | null): string[] {
  if (!colors) return [];
  return colors.split(",").map((c) => c.trim()).filter(Boolean);
}

export function parseTallas(tallas: string | null): string[] {
  if (!tallas) return [];
  return tallas.split(",").map((t) => t.trim()).filter(Boolean);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractHexColor(colorStr: string): string | null {
  const match = colorStr.match(/#[0-9a-fA-F]{3,8}/);
  return match ? match[0] : null;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const COLOR_MAP: Record<string, string> = {
  negro: "#050505",
  blanco: "#ffffff",
  azul: "#2563eb",
  azulmarino: "#1e3a5f",
  azuloscuro: "#1e3a8a",
  rojo: "#dc2626",
  verde: "#16a34a",
  verdeclaro: "#86efac",
  gris: "#9ca3af",
  grisclaro: "#D3D3D3",
  grisoscuro: "#5E5E5E",
  rosado: "#f472b6",
  rosa: "#f472b6",
  azulclaro: "#60a5fa",
  fucsia: "#ff00ff",
  morado: "#7c3aed",
  uva: "#8B008B",
  lila: "#a78bfa",
  vinotinto: "#7f1d1d",
  burdeos: "#7f1d1d",
  amarillo: "#facc15",
  naranja: "#f97316",
  celeste: "#b3ebf2",
  cafe: "#7c4a2d",
  marron: "#7c4a2d",
  cafesuave: "#b08a65",
  camel: "#C19A6B",
  beige: "#d6b98c",
  dorado: "#d4af37",
  plateado: "#c0c0c0",
  packde3: "#e879a6",
  multicolor: "#d4af37",
  surtidos: "#d4af37",
};

export function getColorHex(colorName: string): string {
  const key = colorName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  return COLOR_MAP[key] || "#d6d3d1";
}

export function slugifyColor(colorName: string): string {
  return colorName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function getAllImagePaths(
  image_paths: string[] | Record<string, string[]> | null | undefined
): string[] {
  if (!image_paths) return [];
  if (Array.isArray(image_paths)) return image_paths.filter(Boolean);
  return Object.values(image_paths).flat().filter(Boolean);
}

export function getFirstImagePath(
  image_paths: string[] | Record<string, string[]> | null | undefined
): string | null {
  return getAllImagePaths(image_paths)[0] ?? null;
}

export async function revalidateStore(): Promise<boolean> {
  try {
    const storeUrl = process.env.STORE_URL;
    const token = process.env.STORE_REVALIDATE_TOKEN;
    if (!storeUrl || !token) return false;

    await fetch(`${storeUrl}/api/admin/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-token": token,
      },
      body: JSON.stringify({
        paths: ["/hombres", "/mujeres", "/accesorios", "/"],
      }),
    });
    return true;
  } catch {
    return false;
  }
}
