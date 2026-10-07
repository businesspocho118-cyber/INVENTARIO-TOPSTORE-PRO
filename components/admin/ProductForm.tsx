"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import UnidadesEditor from "./UnidadesEditor";
import { ColorSwatch } from "./ColorSwatch";
import { slugifyColor, isProductBajoPedido } from "@/lib/utils";
import type { Producto } from "@/types/database.types";

const productSchema = z.object({
  product_id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  nombre: z.string().min(1, "El nombre es requerido").max(100),
  descripcion: z.string().optional(),
  precio: z
    .string()
    .min(1)
    .regex(/^\$[\d.,]+$/, "Formato: $44.900"),
  colores: z.string().optional(),
  genero: z.enum(["hombres", "mujeres", "accesorios"]),
  categoria: z.string().optional(),
  tallas: z.string().optional(),
  stock: z.number().int().min(0),
  activo: z.boolean(),
  bajo_pedido: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Producto;
  mode: "create" | "edit";
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string, fallback = "item") {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || fallback;
}

function sanitizeUnits(
  colores: string,
  tallas: string,
  unidades: Record<string, number>
) {
  const clean: Record<string, number> = {};

  for (const color of parseCsv(colores)) {
    for (const talla of parseCsv(tallas)) {
      const key = `${color}-${talla}`;
      clean[key] = Math.max(0, Number(unidades[key] || 0));
    }
  }

  return clean;
}

function sumUnits(unidades: Record<string, number>) {
  return Object.values(unidades).reduce(
    (sum, value) => sum + Math.max(0, Number(value || 0)),
    0
  );
}

export default function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [unidades, setUnidades] = useState<Record<string, number>>(
    product?.unidades || {}
  );
  const [imagePathsByColor, setImagePathsByColor] = useState<
    Record<string, string[]>
  >(() => {
    const raw = product?.image_paths;
    if (!raw) return {};
    // Already an object format: { "negro": ["url1"], "rosado": ["url2"] }
    if (!Array.isArray(raw)) return raw as Record<string, string[]>;
    // Legacy flat array: infer color from URL segments
    const grouped: Record<string, string[]> = {};
    for (const url of raw) {
      const segments = url.replace(/\/+$/, "").split("/");
      // Supabase Storage: .../product-images/products/{slug}/{color}/file
      // Local: /uploads/products/{slug}/{color}/file
      // Cloudflare: .../MUJERES/Chaquetas/file (no color info)
      const parentDir = slugifyColor(segments.length >= 2 ? segments[segments.length - 2] : "");
      const knownColors = [
        "negro", "blanco", "azul", "rojo", "verde", "gris", "rosado", "rosa",
        "morado", "uva", "vinotinto", "burdeos", "amarillo", "naranja", "cafe",
        "marron", "beige", "dorado", "plateado", "multicolor", "lila", "celeste",
        "rojovioleta", "variado", "variados", "surtidos", "surtido", "arcoiris"
      ];
      const colorKey = knownColors.includes(parentDir) ? parentDir : "__unassigned";
      if (!grouped[colorKey]) grouped[colorKey] = [];
      if (!grouped[colorKey].includes(url)) grouped[colorKey].push(url);
    }
    return grouped;
  });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          product_id: product.product_id,
          nombre: product.nombre,
          descripcion: product.descripcion || "",
          precio: product.precio,
          colores: product.colores || "",
          genero:
            product.genero === "mujeres" ||
            product.genero === "hombres" ||
            product.genero === "accesorios"
              ? product.genero
              : "hombres",
          categoria: product.categoria || "",
          tallas: product.tallas || "",
          stock: product.stock,
          activo: product.activo,
          bajo_pedido: product.bajo_pedido ?? isProductBajoPedido(product),
        }
      : {
          product_id: "",
          nombre: "",
          descripcion: "",
          precio: "",
          colores: "",
          genero: "hombres",
          categoria: "",
          tallas: "",
          stock: 0,
          activo: true,
          bajo_pedido: false,
        },
  });

  const nombre = useWatch({ control, name: "nombre" }) || "";
  const productId = useWatch({ control, name: "product_id" }) || "";
  const colores = useWatch({ control, name: "colores" }) || "";
  const tallas = useWatch({ control, name: "tallas" }) || "";
  const categoria = useWatch({ control, name: "categoria" }) || "";
  const activo = useWatch({ control, name: "activo" });
  const bajoPedido = useWatch({ control, name: "bajo_pedido" }) ?? false;

  const isOferta = useMemo(() => {
    const id = (productId || product?.product_id || "").toLowerCase();
    if (
      id === "pack-5-esponjas-variadas" ||
      id === "combo-cosmetiquera-2-monas-3-esponjas" ||
      id === "pack-6-esponjas-2-monas-satin" ||
      id === "pack-3-monas-satin" ||
      id === "pack-3-esponjas-variadas" ||
      id === "mona-satin-cabello"
    ) {
      return true;
    }
    if (categoria?.toLowerCase() === "ofertas") return true;
    if (bajoPedido) return true;
    return false;
  }, [productId, product, categoria, bajoPedido]);

  const [stockDisponible, setStockDisponible] = useState<boolean>(() => {
    if (product && Number(product.stock) === 0) return false;
    return true;
  });
  const colorList = useMemo(() => parseCsv(colores), [colores]);
  const visibleUnidades = useMemo(
    () => sanitizeUnits(colores, tallas, unidades),
    [colores, tallas, unidades]
  );
  const stockTotal = useMemo(() => sumUnits(visibleUnidades), [visibleUnidades]);

  useEffect(() => {
    if (mode === "create" && nombre) {
      setValue("product_id", slugify(nombre, "producto"));
    }
  }, [nombre, mode, setValue]);

  useEffect(() => {
    if (isOferta) {
      setValue("stock", stockDisponible ? 999 : 0);
    } else {
      setValue("stock", stockTotal);
    }
  }, [setValue, stockTotal, isOferta, stockDisponible]);

  const getColorImages = (color: string) => {
    const colorSlug = slugifyColor(color);
    const assigned = imagePathsByColor[colorSlug] || [];
    // Also include unassigned URLs that contain the color slug
    const unassigned = (imagePathsByColor["__unassigned"] || []).filter(
      (url) => url.toLowerCase().includes(colorSlug)
    );
    return [...assigned, ...unassigned];
  };

  const uploadImage = async (
    event: ChangeEvent<HTMLInputElement>,
    color: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!productId.trim()) {
      toast.error("Primero escribí el nombre para generar el ID del producto");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("product_id", productId);
    formData.append("color", color);

    setUploadingImage(color);
    try {
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Error al subir imagen");
        return;
      }

      setImagePathsByColor((prev) => {
        const colorSlug = slugifyColor(color);
        const current = prev[colorSlug] || [];
        if (current.includes(result.path)) return prev;
        return { ...prev, [colorSlug]: [...current, result.path] };
      });
      toast.success("Imagen subida correctamente");
    } catch {
      toast.error("Error de conexión al subir imagen");
    } finally {
      setUploadingImage(null);
      event.target.value = "";
    }
  };

  const addImage = () => {
    const value = newImageUrl.trim();
    if (!value) return;
    setImagePathsByColor((prev) => {
      // Try to match URL to a known color
      const normalizedUrl = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const matchedColor = colorList.find((c) =>
        normalizedUrl.includes(slugifyColor(c))
      );
      const key = matchedColor ? slugifyColor(matchedColor) : "__unassigned";
      const current = prev[key] || [];
      if (current.includes(value)) return prev;
      return { ...prev, [key]: [...current, value] };
    });
    setNewImageUrl("");
  };

  const removeImage = (imagePath: string) => {
    setImagePathsByColor((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter((item) => item !== imagePath);
        if (next[key].length === 0) delete next[key];
      }
      return next;
    });
  };

  const onSubmit = async (data: ProductFormData) => {
    const colorWithoutImage = colorList.find(
      (color) => getColorImages(color).length === 0
    );

    if (colorWithoutImage) {
      toast.error(`Subí al menos una imagen para el color ${colorWithoutImage}`);
      return;
    }

    setSaving(true);
    try {
      const isBajo = isOferta;
      let unitsPayload = visibleUnidades;

      if (isBajo) {
        unitsPayload = {};
        const targetQty = stockDisponible ? 999 : 0;
        const cList = colorList.length ? colorList : ["Variado"];
        const tList = parseCsv(tallas).length ? parseCsv(tallas) : ["UNICA"];

        for (const c of cList) {
          for (const t of tList) {
            unitsPayload[`${c}-${t}`] = targetQty;
          }
        }
        if (Object.keys(unitsPayload).length === 0) {
          unitsPayload = { general: targetQty };
        }
      }

      const payload = {
        ...data,
        bajo_pedido: isBajo,
        stock: isBajo ? (stockDisponible ? 999 : 0) : stockTotal,
        image_paths: imagePathsByColor,
        unidades: unitsPayload,
      };

      const res = await fetch("/api/admin/products", {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok) {
        toast.success(
          mode === "create"
            ? "Producto creado correctamente"
            : "Producto actualizado correctamente"
        );
        router.push("/admin/productos");
        router.refresh();
      } else {
        toast.error(result.error || "Error al guardar producto");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
              ID del Producto (slug)
            </label>
            <input
              {...register("product_id")}
              className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
              disabled={mode === "edit"}
              placeholder="camisa-negra-premium"
            />
            {errors.product_id && (
              <p className="mt-1 text-xs text-admin-danger">
                {errors.product_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
              Nombre
            </label>
            <input
              {...register("nombre")}
              className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
              placeholder="Camisa Negra Premium"
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-admin-danger">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
              Descripción
            </label>
            <textarea
              {...register("descripcion")}
              rows={3}
              className="w-full resize-none rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
              placeholder="Descripción del producto..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
              Precio
            </label>
            <input
              {...register("precio")}
              className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
              placeholder="$44.900"
            />
            {errors.precio && (
              <p className="mt-1 text-xs text-admin-danger">
                {errors.precio.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
                Género
              </label>
              <select
                {...register("genero")}
                className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
              >
                <option value="hombres">Hombres</option>
                <option value="mujeres">Mujeres</option>
                <option value="accesorios">Accesorios</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
                Categoría
              </label>
              <input
                {...register("categoria")}
                list="categoria-suggestions"
                className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                placeholder="Cosmetica, Packs, camisa, leggins..."
              />
              <datalist id="categoria-suggestions">
                <option value="Cosmetica" />
                <option value="Packs" />
                <option value="Ofertas" />
                <option value="Combos" />
                <option value="Accesorios" />
                <option value="Camisas" />
                <option value="Leggins" />
                <option value="Shorts" />
                <option value="Enterizos" />
                <option value="Buzos" />
                <option value="Chaquetas" />
                <option value="Tops" />
                <option value="Medias" />
                <option value="Tarros" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
                Colores
              </label>
              <input
                {...register("colores")}
                className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                placeholder="Negro, Azul, Gris oscuro"
              />
              {colorList.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Vista previa de colores">
                  {colorList.map((color) => (
                    <span key={color} className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-surface-2 px-3 py-1.5 text-xs font-medium text-admin-text">
                      <ColorSwatch colorName={color} size={16} />
                      {color.replace(/#[0-9a-fA-F]{3,8}/g, "").trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
                Tallas
              </label>
              <input
                {...register("tallas")}
                className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                placeholder="S, M, L, XL"
              />
            </div>
          </div>

          {/* Control de Stock para Ofertas / Normal */}
          {isOferta ? (
            <div className="rounded-xl border border-admin-border bg-admin-surface-2 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-admin-text">
                    Disponibilidad de la Oferta (Stock)
                  </p>
                  <p className="text-xs text-admin-text-muted mt-0.5">
                    Las ofertas no usan números de stock. Marcá si está disponible o agotada:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStockDisponible(true);
                      setValue("stock", 999);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                      stockDisponible
                        ? "bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/40"
                        : "bg-admin-bg border border-admin-border text-admin-text-muted hover:text-admin-text"
                    }`}
                  >
                    🟢 Disponible
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStockDisponible(false);
                      setValue("stock", 0);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                      !stockDisponible
                        ? "bg-admin-danger text-white shadow-md ring-2 ring-red-400/40"
                        : "bg-admin-bg border border-admin-border text-admin-text-muted hover:text-admin-text"
                    }`}
                  >
                    🔴 No disponible (Agotado)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-admin-border/50 pt-2 text-xs">
                <span className="text-admin-text-muted">Estado en la tienda:</span>
                <span className={`font-bold ${stockDisponible ? "text-emerald-400" : "text-admin-danger"}`}>
                  {stockDisponible ? "✨ Disponible para compra" : "⚠️ Aparecerá como Agotado"}
                </span>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
                {isOferta ? "Estado de Stock" : "Stock total (automático)"}
              </label>
              {isOferta ? (
                <div className={`w-full rounded-lg px-4 py-2.5 text-sm font-bold border ${
                  stockDisponible
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-admin-danger/30 bg-admin-danger/10 text-admin-danger"
                }`}>
                  {stockDisponible ? "🟢 Disponible" : "🔴 No disponible (Agotado)"}
                </div>
              ) : (
                <input
                  {...register("stock", { valueAsNumber: true })}
                  type="number"
                  min="0"
                  readOnly
                  className="w-full rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                />
              )}
              <p className="mt-1 text-xs text-admin-text-muted">
                {isOferta
                  ? "Las ofertas no usan números de stock; se manejan como Disponible o Agotado."
                  : "Se calcula desde Color + Talla; no se edita aparte."}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
                Activo (visible en tienda)
              </label>
              <div className="mt-2.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setValue("activo", !activo)}
                  className={`toggle-switch ${activo ? "active" : ""}`}
                />
                <span className="text-sm text-admin-text">
                  {activo ? "Sí" : "No"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
              Imágenes por color
            </label>
            <p className="mb-3 rounded-lg border border-admin-border bg-admin-surface-2 px-3 py-2 text-xs text-admin-text-muted">
              Cada color necesita mínimo una imagen. Al subirla, se crea una
              carpeta automática en{" "}
              <strong>
                public/uploads/products/{productId || "producto"}/color/
              </strong>
              . No pegues rutas tipo <strong>C:\carpeta\foto.jpg</strong>.
            </p>

            {colorList.length === 0 ? (
              <div className="rounded-lg border border-admin-border bg-admin-surface-2 px-4 py-3 text-sm text-admin-text-muted">
                Primero escribí los colores separados por coma para subir
                imágenes por color.
              </div>
            ) : (
              <div className="space-y-4">
                {colorList.map((color) => {
                  const colorImages = getColorImages(color);
                  return (
                    <div
                      key={color}
                      className="rounded-xl border border-admin-border bg-admin-surface-2 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ColorSwatch colorName={color} size={20} />
                          <div>
                            <p className="text-sm font-bold text-admin-text">
                              {color}
                            </p>
                            <p className="text-xs text-admin-text-muted">
                              Carpeta: /uploads/products/
                              {slugify(productId, "producto")}/
                              {slugifyColor(color) || "color"}/
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            colorImages.length > 0
                              ? "bg-admin-success/10 text-admin-success"
                              : "bg-admin-danger/10 text-admin-danger"
                          }`}
                        >
                          {colorImages.length} imagen(es)
                        </span>
                      </div>

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) => uploadImage(event, color)}
                        disabled={uploadingImage === color}
                        className="w-full rounded-lg border border-admin-border bg-admin-bg px-4 py-2.5 text-sm text-admin-text file:mr-4 file:rounded-lg file:border-0 file:bg-admin-gold file:px-4 file:py-2 file:text-sm file:font-bold file:text-admin-bg disabled:opacity-50"
                      />
                      {uploadingImage === color && (
                        <p className="mt-1 text-xs font-semibold text-admin-gold">
                          Subiendo imagen...
                        </p>
                      )}

                      {colorImages.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {colorImages.map((url) => (
                            <div key={url} className="rounded-lg bg-admin-bg p-2">
                              <Image
                                src={url}
                                alt={`${color} imagen`}
                                width={120}
                                height={120}
                                unoptimized
                                className="h-24 w-full rounded object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(url)}
                                className="mt-2 w-full rounded border border-admin-danger/40 px-2 py-1 text-xs font-semibold text-admin-danger"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-admin-border bg-admin-surface-2 p-4">
              <label className="mb-1.5 block text-sm font-medium text-admin-text-muted">
                URL manual opcional
              </label>
              <p className="mb-2 text-xs text-admin-text-muted">
                Si pegás una URL, asegurate de que contenga el nombre del color
                para que cuente como imagen de ese color.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-admin-border bg-admin-bg px-4 py-2.5 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                  placeholder="https://.../camisa-negro.jpg"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="rounded-lg bg-admin-gold px-4 py-2.5 text-sm font-semibold text-admin-bg transition-colors hover:bg-admin-gold-light"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>

          <div>
            {isOferta ? (
              <div className="rounded-xl border border-admin-border bg-admin-surface-2 p-5 text-center">
                <p className="text-sm font-bold text-admin-gold">
                  ✨ Oferta sin control de inventario por números
                </p>
                <p className="text-xs text-admin-text-muted mt-1 max-w-md mx-auto">
                  No requieres cargar cantidades numéricas a cada combinación de talla o color. Su stock se controla directamente con los botones de{" "}
                  <strong className={stockDisponible ? "text-emerald-400" : "text-admin-danger"}>
                    {stockDisponible ? "Disponible" : "No disponible (Agotado)"}
                  </strong>.
                </p>
              </div>
            ) : (
              <UnidadesEditor
                colores={colores}
                tallas={tallas}
                unidades={visibleUnidades}
                onChange={setUnidades}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-admin-border pt-4">
        <button
          type="button"
          onClick={() => router.push("/admin/productos")}
          className="rounded-lg border border-admin-border bg-admin-surface-2 px-5 py-2.5 text-sm text-admin-text transition-colors hover:border-admin-gold/30"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-admin-gold px-6 py-2.5 text-sm font-semibold text-admin-bg transition-colors hover:bg-admin-gold-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Guardando..."
            : mode === "create"
              ? "Crear Producto"
              : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
