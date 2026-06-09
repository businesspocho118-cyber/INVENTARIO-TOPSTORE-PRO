import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getFirstImagePath } from "@/lib/utils";
import { Shirt, Layers, CupSoda, Search } from "lucide-react";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const CATEGORIES: {
  icon: typeof Shirt;
  label: string;
  keywords: string[];
  badge: string;
}[] = [
{ icon: Shirt, label: "Camisas", keywords: ["camisa", "camiseta", "sin manga", "tirante", "workout", "alpha", "manga"], badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { icon: Layers, label: "Conjuntos", keywords: ["conjunto"], badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { icon: Search, label: "Shorts", keywords: ["short", "pantaloneta"], badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { icon: Shirt, label: "Enterizos", keywords: ["enterizo"], badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  { icon: Shirt, label: "Leggins", keywords: ["leggin", "legging"], badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { icon: Shirt, label: "Buzos", keywords: ["buzo"], badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { icon: Shirt, label: "Chaquetas", keywords: ["chaqueta"], badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { icon: Shirt, label: "Tops", keywords: ["top", "top"], badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { icon: Shirt, label: "Medias", keywords: ["media", "medias"], badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { icon: CupSoda, label: "Tarros", keywords: ["tarro"], badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
];

type Product = {
  product_id: string;
  nombre: string;
  descripcion: string | null;
  precio: string;
  genero: "hombres" | "mujeres" | "accesorios" | "unisex" | string;
  categoria: string | null;
  image_paths: string[] | Record<string, string[]> | null;
  stock: number | null;
  activo: boolean | null;
  tallas: string | null;
  colores: string | null;
  unidades: Record<string, number> | null;
};

type StockVariant = {
  key: string;
  color: string;
  talla: string;
  units: number;
};

function parseVariant(key: string, units: number): StockVariant {
  const separator = key.lastIndexOf("-");

  if (separator <= 0) {
    return {
      key,
      color: key || "Sin color",
      talla: "Única",
      units,
    };
  }

  return {
    key,
    color: key.slice(0, separator) || "Sin color",
    talla: key.slice(separator + 1) || "Única",
    units,
  };
}

function getVariants(product: Product) {
  const entries = Object.entries(product.unidades || {})
    .map(([key, value]) => parseVariant(key, Number(value) || 0))
    .filter((variant) => variant.units > 0)
    .sort(
      (a, b) =>
        a.color.localeCompare(b.color) || a.talla.localeCompare(b.talla)
    );

  if (entries.length) return entries;
  if (Number(product.stock || 0) <= 0) return [];

  return [
    {
      key: "stock-general",
      color: product.colores || "Stock general",
      talla: product.tallas || "Única",
      units: Number(product.stock || 0),
    },
  ];
}

function hasAvailableStock(product: Product) {
  return getVariants(product).length > 0;
}

function hashColor(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360}, 75%, 48%)`;
}

function colorToBackground(color: string) {
  // Strip any hex codes that came from DB (e.g. "Gris oscuro #545454")
  const colorSlug = color.replace(/#[0-9a-fA-F]{3,8}/g, "").trim();
  if (!colorSlug) return hashColor(color);

  const normalized = colorSlug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .trim();

  const palette: Record<string, string> = {
    negro: "#050505",
    blanco: "#ffffff",
    gris: "#9ca3af",
    "gris claro": "#D3D3D3",
    "gris oscuro": "#5E5E5E",
    azul: "#2563eb",
    "azul claro": "#60a5fa",
    "azul oscuro": "#1e3a8a",
    rojo: "#dc2626",
    vinotinto: "#7f1d1d",
    burdeos: "#7f1d1d",
    rosado: "#f472b6",
    rosa: "#f472b6",
    verde: "#16a34a",
    "verde claro": "#86efac",
    amarillo: "#facc15",
    dorado: "#d4af37",
    beige: "#d6b98c",
    cafe: "#7c4a2d",
    marron: "#7c4a2d",
    "cafe suave": "#b08a65",
    naranja: "#f97316",
    morado: "#7c3aed",
    lila: "#a78bfa",
    crema: "#f5edd8",
    fucsia: "#ff00ff",
    celeste: "#b3ebf2",
    uva: "#8B008B",
    plateado: "#c0c0c0",
  };

  const exact = palette[normalized];
  if (exact) return exact;

  const colorParts = normalized
    .split(/\/|\+|,|\sy\s|\scon\s/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => palette[part] || hashColor(part));

  if (colorParts.length > 1) {
    return `linear-gradient(135deg, ${colorParts
      .map((part, index) => {
        const start = Math.round((index / colorParts.length) * 100);
        const end = Math.round(((index + 1) / colorParts.length) * 100);
        return `${part} ${start}% ${end}%`;
      })
      .join(", ")})`;
  }

  const keyword = Object.entries(palette).find(([name]) =>
    normalized.includes(name)
  );

  return keyword?.[1] || hashColor(normalized || color);
}

async function getActiveProducts() {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .select(
      "product_id,nombre,descripcion,precio,genero,categoria,image_paths,stock,activo,tallas,colores,unidades"
    )
    .eq("activo", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Public stock catalog error:", error.message);
    return [];
  }

  return (data || []) as Product[];
}

function StockCard({ product }: { product: Product }) {
  const image = getFirstImagePath(product.image_paths);
  const variants = getVariants(product);
  const availableUnits = variants.reduce((sum, item) => sum + item.units, 0);
  const soldOut = availableUnits <= 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-admin-border bg-admin-surface shadow-sm transition hover:-translate-y-1 hover:border-admin-gold/60">
      <div className="relative aspect-[4/5] bg-admin-surface-2">
        {image ? (
          <Image
            src={image}
            alt={product.nombre}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-admin-text-muted">
            Sin imagen
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-admin-bg/85 px-3 py-1 text-xs font-bold uppercase tracking-wide text-admin-gold backdrop-blur">
          {product.genero}
        </span>
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-admin-danger px-3 py-1 text-xs font-semibold text-white">
            Agotado
          </span>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
            {product.categoria || "Prenda"}
          </p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold text-admin-text">
            {product.nombre}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xl font-black text-admin-gold">
              {product.precio}
            </p>
            <p className="rounded-full bg-admin-surface-2 px-3 py-1 text-sm font-bold text-admin-text">
              {availableUnits} und.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-admin-border bg-admin-bg/50 p-3">
          <div className="mb-2 grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 text-[11px] font-bold uppercase tracking-wide text-admin-text-muted">
            <span>Color</span>
            <span>Talla</span>
            <span className="text-right">Unidades</span>
          </div>
          <div className="max-h-44 space-y-2 overflow-auto pr-1">
            {variants.map((variant) => (
              <div
                key={variant.key}
                className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 rounded-lg bg-admin-surface px-3 py-2 text-sm"
              >
                <span className="flex items-center">
                  <span
                    aria-label={variant.color}
                    title={variant.color}
                    className="inline-block h-6 w-6 rounded-full border border-admin-border shadow-sm ring-2 ring-white/70"
                    style={{ background: colorToBackground(variant.color) }}
                  />
                </span>
                <span className="font-medium uppercase text-admin-text-muted">
                  {variant.talla}
                </span>
                <span
                  className={`text-right font-black ${
                    variant.units > 0
                      ? "text-admin-success"
                      : "text-admin-danger"
                  }`}
                >
                  {variant.units}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function Home() {
  const products = (await getActiveProducts()).filter(hasAvailableStock);
  if (products.length === 0) {
    return (
      <main className="min-h-screen bg-admin-bg text-admin-text">
        <section className="border-b border-admin-border bg-gradient-to-b from-admin-surface to-admin-bg">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-admin-gold">TOPSTORE</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Zona de stock</h1>
                <p className="mt-3 max-w-2xl text-admin-text-muted">Inventario visible por género, color, talla y unidades reales de cada prenda activa.</p>
              </div>
              <Link href="/admin" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-admin-gold px-5 py-3 text-sm font-bold text-admin-bg transition hover:bg-admin-gold-light">Ir al panel admin</Link>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-admin-border bg-admin-surface p-8 text-center">
            <p className="font-medium">No hay productos activos.</p>
            <p className="mt-2 text-sm text-admin-text-muted">Activá productos desde el panel para que aparezcan acá.</p>
          </div>
        </section>
      </main>
    );
  }

  // Infer category for each product based on name
  function inferCategory(product: Product): (typeof CATEGORIES)[number] | null {
    const name = product.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const categoria = product.categoria?.toLowerCase() || "";
    for (const cat of CATEGORIES) {
      if (cat.keywords.some((kw) => name.includes(kw) || categoria.includes(kw))) return cat;
    }
    return null;
  }

  const SIN_MANGA_KW = ["sin manga", "tirante", "i dont care", "workout", "alpha"];

function isSinManga(product: Product) {
  const name = product.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return SIN_MANGA_KW.some((kw) => name.includes(kw));
}

function groupByCategory(prods: Product[]) {
    const groups: { cat: (typeof CATEGORIES)[number]; products: Product[] }[] = [];
    const uncategorized: Product[] = [];

    for (const p of prods) {
      const cat = inferCategory(p);
      if (cat) {
        let group = groups.find((g) => g.cat.label === cat.label);
        if (!group) {
          group = { cat, products: [] };
          groups.push(group);
        }
        group.products.push(p);
      } else {
        uncategorized.push(p);
      }
    }

    // Always put "Otras" at the end if there are uncategorized products
    if (uncategorized.length > 0) {
      groups.push({
        cat: { icon: Search, label: "Otras prendas", keywords: [], badge: "bg-admin-surface-2 text-admin-text-muted border-admin-border" },
        products: uncategorized,
      });
    }

    return groups;
  }

  const genSections = [
    { gender: "mujeres", title: "Mujer", products: products.filter((p) => p.genero === "mujeres") },
    { gender: "hombres", title: "Hombre", products: products.filter((p) => p.genero === "hombres") },
    { gender: "accesorios", title: "Accesorios", products: products.filter((p) => p.genero !== "mujeres" && p.genero !== "hombres") },
  ].filter((s) => s.products.length > 0);

  return (
    <main className="min-h-screen bg-admin-bg text-admin-text">
      <section className="border-b border-admin-border bg-gradient-to-b from-admin-surface to-admin-bg">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-admin-gold">TOPSTORE</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Zona de stock</h1>
              <p className="mt-3 max-w-2xl text-admin-text-muted">Inventario visible por género, color, talla y unidades reales de cada prenda activa.</p>
            </div>
            <Link href="/admin" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-admin-gold px-5 py-3 text-sm font-bold text-admin-bg transition hover:bg-admin-gold-light">Ir al panel admin</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6 lg:px-8">
        {genSections.map(({ title, products: genProds }) => {
          const catGroups = groupByCategory(genProds);
          return (
            <section key={title} className="space-y-8">
              {/* Gender header */}
              <div className="flex items-center gap-4 border-b border-admin-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-admin-gold/10 text-lg font-bold text-admin-gold">
                  {title.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-admin-text">{title}</h2>
                  <p className="text-sm text-admin-text-muted">{genProds.length} producto(s) activo(s)</p>
                </div>
              </div>

              {/* Category groups */}
              <div className="space-y-10">
                {catGroups.map(({ cat, products: catProds }) => {
                  const Icon = cat.icon;
                  const isHombres = title === "Hombre";
                  const isCamisas = cat.label === "Camisas";

                  // Split Camisas into con/sin mangas for hombres
                  if (isHombres && isCamisas) {
                    const sinManga = catProds.filter(isSinManga);
                    const conManga = catProds.filter((p) => !isSinManga(p));
                    return (
                      <div key={cat.label}>
                        <div className="mb-4 flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${cat.badge}`}>
                            <Icon size={16} />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-[0.2em] text-admin-text">Camisas</h3>
                          <span className={`ml-auto rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cat.badge}`}>
                            {catProds.length} prendas
                          </span>
                        </div>
                        <div className="space-y-8">
                          {conManga.length > 0 && (
                            <div>
                              <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-admin-text-muted">
                                <span className="h-1 w-4 rounded-full bg-blue-400/50" /> Con mangas · {conManga.length}
                              </h4>
                              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {conManga.map((product) => (
                                  <StockCard key={product.product_id} product={product} />
                                ))}
                              </div>
                            </div>
                          )}
                          {sinManga.length > 0 && (
                            <div>
                              <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-admin-text-muted">
                                <span className="h-1 w-4 rounded-full bg-blue-400/50" /> Sin mangas · {sinManga.length}
                              </h4>
                              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {sinManga.map((product) => (
                                  <StockCard key={product.product_id} product={product} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={cat.label}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${cat.badge}`}>
                          <Icon size={16} />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-[0.2em] text-admin-text">{cat.label}</h3>
                        <span className={`ml-auto rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cat.badge}`}>
                          {catProds.length} {catProds.length === 1 ? "prenda" : "prendas"}
                        </span>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {catProds.map((product) => (
                          <StockCard key={product.product_id} product={product} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}
