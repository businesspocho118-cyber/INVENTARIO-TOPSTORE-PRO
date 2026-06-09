"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Cliente, Producto } from "@/types/database.types";

type ClientMode = "existing" | "new";
type DeliveryType = "envio" | "retiro_tienda";

type VariantOption = {
  key: string;
  color: string;
  talla: string;
  units: number;
};

type Item = {
  product_id: string;
  producto_nombre: string;
  variant_key: string;
  color: string;
  talla: string;
  cantidad: number;
  precio_unitario: number;
};

const emptyItem: Item = {
  product_id: "",
  producto_nombre: "",
  variant_key: "",
  color: "",
  talla: "",
  cantidad: 1,
  precio_unitario: 0,
};

function parsePrice(price: string | null | undefined) {
  const numeric = String(price || "").replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function parseVariant(key: string, units: number): VariantOption {
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

function getVariantOptions(product?: Producto): VariantOption[] {
  if (!product) return [];

  return Object.entries(product.unidades || {})
    .map(([key, units]) => parseVariant(key, Number(units) || 0))
    .filter((variant) => variant.units > 0)
    .sort(
      (a, b) =>
        a.color.localeCompare(b.color) || a.talla.localeCompare(b.talla)
    );
}

export default function OrderForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [products, setProducts] = useState<Producto[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [clientMode, setClientMode] = useState<ClientMode>("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);
  const [form, setForm] = useState({
    cliente_id: "",
    cliente_nombre: "",
    cliente_telefono: "",
    cliente_direccion: "",
    cliente_barrio: "",
    cliente_referencias: "",
    tipo_entrega: "envio" as DeliveryType,
    metodo_pago: "efectivo",
    estado: "entregado",
    notas: "",
  });

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/api/admin/products?limit=500").then((res) => res.json()),
      fetch("/api/admin/clients?limit=500").then((res) => res.json()),
    ])
      .then(([productData, clientData]) => {
        if (!mounted) return;
        setProducts(productData.products || []);
        setClients(clientData.clients || []);
      })
      .catch(() => toast.error("No se pudieron cargar productos/clientes"))
      .finally(() => {
        if (mounted) setLoadingData(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeProducts = useMemo(
    () => products.filter((product) => product.activo),
    [products]
  );

  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();
    if (!search) return clients.slice(0, 80);

    return clients
      .filter((client) => {
        return (
          client.nombre.toLowerCase().includes(search) ||
          String(client.telefono || "").includes(search)
        );
      })
      .slice(0, 80);
  }, [clientSearch, clients]);

  const selectedClient = useMemo(
    () =>
      clients.find((client) => String(client.id) === form.cliente_id) || null,
    [clients, form.cliente_id]
  );

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.cantidad * item.precio_unitario,
        0
      ),
    [items]
  );

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectClient = (clientId: string) => {
    const client = clients.find((item) => String(item.id) === clientId);
    setForm((prev) => ({
      ...prev,
      cliente_id: clientId,
      cliente_nombre: client?.nombre || "",
      cliente_telefono: client?.telefono || "",
      cliente_direccion: client?.direccion || "",
      cliente_referencias: client?.referencias || "",
      metodo_pago: client?.ultimo_metodo_pago || prev.metodo_pago,
    }));
  };

  const resetClientForMode = (mode: ClientMode) => {
    setClientMode(mode);
    setForm((prev) => ({
      ...prev,
      cliente_id: "",
      cliente_nombre: "",
      cliente_telefono: "",
      cliente_direccion: "",
      cliente_barrio: "",
      cliente_referencias: "",
    }));
  };

  const setItem = (index: number, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const selectProduct = (index: number, productId: string) => {
    const product = activeProducts.find((item) => item.product_id === productId);
    const variants = getVariantOptions(product);
    const firstVariant = variants[0];

    setItem(index, {
      product_id: productId,
      producto_nombre: product?.nombre || "",
      variant_key: firstVariant?.key || "",
      color: firstVariant?.color || "",
      talla: firstVariant?.talla || "",
      cantidad: firstVariant ? 1 : 0,
      precio_unitario: parsePrice(product?.precio),
    });
  };

  const selectVariant = (index: number, variantKey: string) => {
    const item = items[index];
    const product = activeProducts.find(
      (productItem) => productItem.product_id === item.product_id
    );
    const variant = getVariantOptions(product).find(
      (option) => option.key === variantKey
    );

    if (!variant) {
      setItem(index, {
        variant_key: "",
        color: "",
        talla: "",
        cantidad: 0,
      });
      return;
    }

    setItem(index, {
      variant_key: variant.key,
      color: variant.color,
      talla: variant.talla,
      cantidad: Math.min(Math.max(item.cantidad || 1, 1), variant.units),
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (clientMode === "existing" && !form.cliente_id) {
      toast.error("Seleccioná un cliente existente o cambiá a cliente nuevo");
      return;
    }

    if (clientMode === "new" && !form.cliente_nombre.trim()) {
      toast.error("El nombre del cliente nuevo es obligatorio");
      return;
    }

    if (form.tipo_entrega === "envio" && !form.cliente_direccion.trim()) {
      toast.error("La dirección es obligatoria cuando el pedido es envío");
      return;
    }

    const cleanItems = items.filter((item) => item.product_id && item.variant_key);

    if (!cleanItems.length) {
      toast.error("Agregá al menos una prenda del inventario");
      return;
    }

    const invalidItem = cleanItems.find((item) => {
      const product = activeProducts.find(
        (productItem) => productItem.product_id === item.product_id
      );
      const variant = getVariantOptions(product).find(
        (option) => option.key === item.variant_key
      );

      return !variant || item.cantidad < 1 || item.cantidad > variant.units;
    });

    if (invalidItem) {
      toast.error("Hay una prenda con talla/color sin stock suficiente");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cliente_id:
            clientMode === "existing" ? Number(form.cliente_id) : undefined,
          items: cleanItems,
          total,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al crear pedido");
        return;
      }

      toast.success("Pedido creado correctamente");
      router.push(`/admin/pedidos/${data.order.id}`);
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="admin-data-card rounded-xl p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">
              Cliente del pedido
            </h2>
            <p className="text-sm text-admin-text-muted">
              Elegí uno existente o cargá solo los datos del cliente nuevo.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-admin-border bg-admin-surface-2 p-1">
            <button
              type="button"
              onClick={() => resetClientForMode("existing")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                clientMode === "existing"
                  ? "bg-admin-gold text-admin-bg"
                  : "text-admin-text-muted"
              }`}
            >
              Cliente existente
            </button>
            <button
              type="button"
              onClick={() => resetClientForMode("new")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                clientMode === "new"
                  ? "bg-admin-gold text-admin-bg"
                  : "text-admin-text-muted"
              }`}
            >
              Cliente nuevo
            </button>
          </div>
        </div>

        {clientMode === "existing" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-admin-text-muted">
                Buscar cliente
              </span>
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="admin-field w-full rounded-lg px-4 py-3 text-sm"
                placeholder="Nombre o teléfono"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-admin-text-muted">
                Cliente
              </span>
              <select
                value={form.cliente_id}
                onChange={(e) => selectClient(e.target.value)}
                className="admin-field w-full rounded-lg px-4 py-3 text-sm"
                disabled={loadingData}
              >
                <option value="">Seleccionar cliente</option>
                {filteredClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nombre} {client.telefono ? `- ${client.telefono}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {selectedClient && (
              <div className="rounded-xl border border-admin-border bg-admin-surface-2 p-4 text-sm text-admin-text md:col-span-2">
                <p className="font-bold">{selectedClient.nombre}</p>
                <p className="text-admin-text-muted">
                  {selectedClient.telefono || "Sin teléfono"} ·{" "}
                  {selectedClient.direccion || "Sin dirección guardada"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-admin-text-muted">
                Nombre
              </span>
              <input
                value={form.cliente_nombre}
                onChange={(e) => setField("cliente_nombre", e.target.value)}
                className="admin-field w-full rounded-lg px-4 py-3 text-sm"
                placeholder="Nombre del cliente"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-admin-text-muted">
                Teléfono
              </span>
              <input
                value={form.cliente_telefono}
                onChange={(e) => setField("cliente_telefono", e.target.value)}
                className="admin-field w-full rounded-lg px-4 py-3 text-sm"
                placeholder="Teléfono"
              />
            </label>
          </div>
        )}
      </section>

      <section className="admin-data-card rounded-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-admin-text">
          Entrega y pago
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-admin-text-muted">
              Tipo de entrega
            </span>
            <select
              value={form.tipo_entrega}
              onChange={(e) =>
                setField("tipo_entrega", e.target.value as DeliveryType)
              }
              className="admin-field w-full rounded-lg px-4 py-3 text-sm"
            >
              <option value="envio">Envío</option>
              <option value="retiro_tienda">Retiro en tienda</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-admin-text-muted">
              Método de pago
            </span>
            <select
              value={form.metodo_pago}
              onChange={(e) => setField("metodo_pago", e.target.value)}
              className="admin-field w-full rounded-lg px-4 py-3 text-sm"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="contraentrega">Contraentrega</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-admin-text-muted">
              Dirección {form.tipo_entrega === "retiro_tienda" ? "(opcional)" : ""}
            </span>
            <input
              value={form.cliente_direccion}
              onChange={(e) => setField("cliente_direccion", e.target.value)}
              className="admin-field w-full rounded-lg px-4 py-3 text-sm"
              placeholder={
                form.tipo_entrega === "retiro_tienda"
                  ? "No obligatoria para retiro"
                  : "Dirección de entrega"
              }
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-admin-text-muted">
              Barrio
            </span>
            <input
              value={form.cliente_barrio}
              onChange={(e) => setField("cliente_barrio", e.target.value)}
              className="admin-field w-full rounded-lg px-4 py-3 text-sm"
              placeholder="Barrio"
            />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-semibold text-admin-text-muted">
              Referencias
            </span>
            <input
              value={form.cliente_referencias}
              onChange={(e) => setField("cliente_referencias", e.target.value)}
              className="admin-field w-full rounded-lg px-4 py-3 text-sm"
              placeholder="Referencias de entrega o retiro"
            />
          </label>
        </div>
      </section>

      <section className="admin-data-card rounded-xl p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">
              Prendas del pedido
            </h2>
            <p className="text-sm text-admin-text-muted">
              Producto, color y talla salen del inventario real.
            </p>
          </div>
          <div className="text-2xl font-bold text-admin-gold">
            Total: ${total.toLocaleString("es-CO")}
          </div>
        </div>

        <div className="mb-4">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-admin-text-muted">
              Estado inicial
            </span>
            <select
              value={form.estado}
              onChange={(e) => setField("estado", e.target.value)}
              className="admin-field rounded-lg px-4 py-3 text-sm"
            >
              <option value="entregado">Entregado</option>
            </select>
            <p className="mt-1 text-xs text-admin-text-muted">
              Supabase solo está aceptando “entregado” en la tabla actual.
            </p>
          </label>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const selectedProduct = activeProducts.find(
              (product) => product.product_id === item.product_id
            );
            const variants = getVariantOptions(selectedProduct);
            const selectedVariant = variants.find(
              (variant) => variant.key === item.variant_key
            );

            return (
              <div
                key={index}
                className="grid gap-3 rounded-xl border border-admin-border bg-admin-surface-2 p-4 md:grid-cols-[2fr_1.7fr_90px_130px_auto]"
              >
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-admin-text-muted">
                    Prenda
                  </span>
                  <select
                    value={item.product_id}
                    onChange={(e) => selectProduct(index, e.target.value)}
                    className="admin-field w-full rounded-lg px-3 py-2 text-sm"
                    disabled={loadingData}
                  >
                    <option value="">Seleccionar prenda</option>
                    {activeProducts.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.nombre} · {product.genero}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-admin-text-muted">
                    Color / talla disponible
                  </span>
                  <select
                    value={item.variant_key}
                    onChange={(e) => selectVariant(index, e.target.value)}
                    className="admin-field w-full rounded-lg px-3 py-2 text-sm"
                    disabled={!item.product_id || variants.length === 0}
                  >
                    <option value="">
                      {item.product_id ? "Seleccionar variante" : "Primero elegí prenda"}
                    </option>
                    {variants.map((variant) => (
                      <option key={variant.key} value={variant.key}>
                        {variant.color} / {variant.talla} — {variant.units} und.
                      </option>
                    ))}
                  </select>
                  {item.product_id && variants.length === 0 && (
                    <p className="text-xs font-semibold text-admin-danger">
                      Esta prenda no tiene unidades disponibles.
                    </p>
                  )}
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-admin-text-muted">
                    Cant.
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={selectedVariant?.units || 1}
                    value={item.cantidad}
                    onChange={(e) =>
                      setItem(index, {
                        cantidad: Math.min(
                          Number(e.target.value) || 1,
                          selectedVariant?.units || 1
                        ),
                      })
                    }
                    className="admin-field w-full rounded-lg px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-admin-text-muted">
                    Precio unit.
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={item.precio_unitario}
                    onChange={(e) =>
                      setItem(index, {
                        precio_unitario: Number(e.target.value) || 0,
                      })
                    }
                    className="admin-field w-full rounded-lg px-3 py-2 text-sm"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                  disabled={items.length === 1}
                  className="min-h-11 rounded-lg border border-admin-danger/50 px-3 py-2 text-sm font-semibold text-admin-danger disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
          className="mt-4 min-h-11 rounded-lg border border-admin-gold/70 px-4 py-2 text-sm font-semibold text-admin-gold hover:bg-admin-gold/10"
        >
          + Agregar prenda
        </button>
      </section>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-admin-text-muted">
          Notas internas
        </span>
        <textarea
          value={form.notas}
          onChange={(e) => setField("notas", e.target.value)}
          className="admin-field min-h-24 w-full rounded-xl px-4 py-3 text-sm"
          placeholder="Notas internas del pedido"
        />
      </label>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/pedidos")}
          className="min-h-11 rounded-lg border border-admin-border bg-admin-surface-2 px-5 py-3 text-sm font-semibold text-admin-text"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || loadingData}
          className="min-h-11 rounded-lg bg-admin-gold px-6 py-3 text-sm font-bold text-admin-bg hover:bg-admin-gold-light disabled:opacity-50"
        >
          {saving ? "Creando..." : "Crear pedido"}
        </button>
      </div>
    </form>
  );
}
