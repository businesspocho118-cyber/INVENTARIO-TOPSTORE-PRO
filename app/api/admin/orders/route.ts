import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidateStore } from "@/lib/utils";

export const runtime = "edge";

type OrderItemInput = {
  product_id?: string;
  variant_key?: string;
  producto_nombre?: string;
  nombre?: string;
  cantidad?: number;
  precio_unitario?: number;
};

type ProductForOrder = {
  product_id: string;
  nombre: string;
  precio: string;
  activo: boolean;
  unidades: Record<string, number> | null;
};

type InventoryUpdate = {
  productId: string;
  originalUnits: Record<string, number>;
  originalStock: number;
  nextUnits: Record<string, number>;
  nextStock: number;
};

function makeIntegerId() {
  return Math.floor(Date.now() % 2_000_000_000);
}

function parsePrice(price: string | null | undefined) {
  const numeric = String(price || "").replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function sumUnits(units: Record<string, number>) {
  return Object.values(units).reduce(
    (total, quantity) => total + Math.max(0, Number(quantity || 0)),
    0
  );
}

function parseVariant(key: string) {
  const separator = key.lastIndexOf("-");

  if (separator <= 0) {
    return {
      color: key || "Sin color",
      talla: "Única",
    };
  }

  return {
    color: key.slice(0, separator) || "Sin color",
    talla: key.slice(separator + 1) || "Única",
  };
}

function normalizeClientName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

// GET /api/admin/orders — List orders or get single order
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    if (id) {
      const { data, error } = await supabaseAdmin
        .from("pedidos")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Pedido no encontrado" },
          { status: 404 }
        );
      }
      return NextResponse.json({ order: data });
    }

    const search = searchParams.get("search") || "";
    const estado = searchParams.get("estado") || "";
    const metodo_pago = searchParams.get("metodo_pago") || "";
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = page * limit;

    let query = supabaseAdmin
      .from("pedidos")
      .select("*", { count: "exact" })
      .order("fecha", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `cliente_nombre.ilike.%${search}%,cliente_telefono.ilike.%${search}%`
      );
    }
    if (estado) {
      query = query.eq("estado", estado);
    }
    if (metodo_pago) {
      query = query.eq("metodo_pago", metodo_pago);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [], total: count || 0 });
  } catch (err) {
    console.error("Orders GET error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/admin/orders — Create order manually from existing inventory
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Agrega al menos una prenda del inventario" },
        { status: 400 }
      );
    }

    let clienteNombre = normalizeClientName(String(body.cliente_nombre || ""));
    const telefono = String(body.cliente_telefono || "").trim();
    let clientId: number | null = null;
    let clientWasCreated = false;

    if (!clienteNombre) {
      return NextResponse.json(
        { error: "El nombre del cliente es requerido" },
        { status: 400 }
      );
    }

    if (body.cliente_id) {
      const { data: existingClient, error: clientFetchError } =
        await supabaseAdmin
          .from("clientes")
          .select("*")
          .eq("id", Number(body.cliente_id))
          .maybeSingle();

      if (clientFetchError || !existingClient) {
        return NextResponse.json(
          { error: "Cliente existente no encontrado" },
          { status: 400 }
        );
      }

      clientId = existingClient.id;
      clienteNombre = clienteNombre || existingClient.nombre;

      await supabaseAdmin
        .from("clientes")
        .update({
          direccion: body.cliente_direccion || existingClient.direccion,
          referencias: body.cliente_referencias || existingClient.referencias,
          ultimo_metodo_pago:
            body.metodo_pago || existingClient.ultimo_metodo_pago,
        })
        .eq("id", existingClient.id);
    } else {
      const { data: duplicateNames } = await supabaseAdmin
        .from("clientes")
        .select("id,nombre,telefono")
        .ilike("nombre", clienteNombre)
        .limit(1);

      const { data: duplicateByPhone } = telefono
        ? await supabaseAdmin
            .from("clientes")
            .select("id,nombre,telefono")
            .eq("telefono", telefono)
            .maybeSingle()
        : { data: null };

      const duplicate = duplicateNames?.[0] || duplicateByPhone;
      if (duplicate) {
        return NextResponse.json(
          {
            error: `El cliente ya existe${duplicate.nombre ? `: ${duplicate.nombre}` : ""}. Seleccioná el cliente existente para registrar la compra.`,
          },
          { status: 409 }
        );
      }
    }

    const rawItems = body.items as OrderItemInput[];
    const productIds = rawItems
      .map((item) => String(item.product_id || "").trim())
      .filter(Boolean);

    if (productIds.length !== rawItems.length) {
      return NextResponse.json(
        { error: "Todas las prendas deben venir del inventario" },
        { status: 400 }
      );
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from("productos")
      .select("product_id,nombre,precio,activo,unidades")
      .in("product_id", Array.from(new Set(productIds)));

    if (productsError) {
      return NextResponse.json(
        { error: productsError.message },
        { status: 400 }
      );
    }

    const productMap = new Map(
      ((products || []) as ProductForOrder[]).map((product) => [
        product.product_id,
        product,
      ])
    );
    const requestedByVariant = new Map<string, number>();

    for (const item of rawItems) {
      const productId = String(item.product_id || "").trim();
      const variantKey = String(item.variant_key || "").trim();
      const quantity = Number(item.cantidad || 0);
      const product = productMap.get(productId);

      if (!product || !product.activo) {
        return NextResponse.json(
          { error: "Una de las prendas no existe o está inactiva" },
          { status: 400 }
        );
      }

      if (!variantKey || quantity < 1) {
        return NextResponse.json(
          { error: "Color, talla y cantidad son requeridos para cada prenda" },
          { status: 400 }
        );
      }

      const available = Number(product.unidades?.[variantKey] || 0);
      if (available <= 0) {
        return NextResponse.json(
          {
            error: `${product.nombre} no tiene stock disponible en esa talla/color`,
          },
          { status: 400 }
        );
      }

      const aggregateKey = `${productId}::${variantKey}`;
      requestedByVariant.set(
        aggregateKey,
        (requestedByVariant.get(aggregateKey) || 0) + quantity
      );

      if ((requestedByVariant.get(aggregateKey) || 0) > available) {
        return NextResponse.json(
          {
            error: `${product.nombre} no tiene suficientes unidades en esa talla/color`,
          },
          { status: 400 }
        );
      }
    }

    const items = rawItems.map((item) => {
      const product = productMap.get(String(item.product_id));
      const variant = parseVariant(String(item.variant_key));
      const unitPrice =
        Number(item.precio_unitario || 0) || parsePrice(product?.precio);

      return {
        product_id: product?.product_id,
        variant_key: String(item.variant_key),
        producto_nombre: product?.nombre || item.producto_nombre || item.nombre,
        nombre: product?.nombre || item.producto_nombre || item.nombre,
        color: variant.color,
        talla: variant.talla,
        cantidad: Number(item.cantidad || 1),
        precio_unitario: unitPrice,
        precio: `$${unitPrice.toLocaleString("es-CO")}`,
      };
    });

    const total = items.reduce(
      (sum, item) => sum + Number(item.cantidad || 0) * item.precio_unitario,
      0
    );

    const inventoryUpdates: InventoryUpdate[] = Array.from(
      productMap.values()
    ).map((product) => {
      const originalUnits = { ...(product.unidades || {}) };
      const nextUnits = { ...originalUnits };
      const productPrefix = `${product.product_id}::`;

      for (const [aggregateKey, requestedQuantity] of requestedByVariant) {
        if (!aggregateKey.startsWith(productPrefix)) continue;

        const variantKey = aggregateKey.slice(productPrefix.length);
        nextUnits[variantKey] =
          Number(nextUnits[variantKey] || 0) - requestedQuantity;
      }

      return {
        productId: product.product_id,
        originalUnits,
        originalStock: sumUnits(originalUnits),
        nextUnits,
        nextStock: sumUnits(nextUnits),
      };
    });

    const deliveryLabel =
      body.tipo_entrega === "retiro_tienda" ? "Retiro en tienda" : "Envío";
    const notes = [`Entrega: ${deliveryLabel}`, body.notas]
      .filter(Boolean)
      .join("\n");

    if (!clientId) {
      clientId = makeIntegerId();
      const { error: clientError } = await supabaseAdmin.from("clientes").insert({
        id: clientId,
        nombre: clienteNombre,
        telefono: telefono || null,
        direccion: body.cliente_direccion || null,
        referencias: body.cliente_referencias || null,
        ultimo_metodo_pago: body.metodo_pago || null,
        compras: 0,
      });

      if (clientError) {
        return NextResponse.json({ error: clientError.message }, { status: 400 });
      }
      clientWasCreated = true;
    }

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .insert({
        id: makeIntegerId(),
        fecha: new Date().toISOString(),
        cliente_nombre: clienteNombre,
        cliente_telefono: telefono || null,
        cliente_direccion: body.cliente_direccion || null,
        cliente_barrio: body.cliente_barrio || null,
        cliente_referencias: body.cliente_referencias || null,
        metodo_pago: body.metodo_pago || null,
        estado: "entregado",
        total,
        notas: notes || null,
        items,
      })
      .select()
      .single();

    if (error) {
      if (clientWasCreated) {
        await supabaseAdmin.from("clientes").delete().eq("id", clientId);
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: clientAfterPurchase, error: loyaltyError } = await supabaseAdmin
      .from("clientes")
      .select("compras")
      .eq("id", clientId)
      .single();

    if (loyaltyError || !clientAfterPurchase) {
      await supabaseAdmin.from("pedidos").delete().eq("id", data.id);
      if (clientWasCreated) {
        await supabaseAdmin.from("clientes").delete().eq("id", clientId);
      }
      return NextResponse.json(
        { error: "No se pudo actualizar la fidelidad del cliente." },
        { status: 500 }
      );
    }

    const { error: loyaltyUpdateError } = await supabaseAdmin
      .from("clientes")
      .update({ compras: Number(clientAfterPurchase.compras || 0) + 1 })
      .eq("id", clientId);

    if (loyaltyUpdateError) {
      await supabaseAdmin.from("pedidos").delete().eq("id", data.id);
      if (clientWasCreated) {
        await supabaseAdmin.from("clientes").delete().eq("id", clientId);
      }
      return NextResponse.json(
        { error: "No se pudo actualizar la fidelidad del cliente." },
        { status: 500 }
      );
    }

    const appliedInventoryUpdates: InventoryUpdate[] = [];

    for (const inventoryUpdate of inventoryUpdates) {
      const { error: inventoryError } = await supabaseAdmin
        .from("productos")
        .update({
          unidades: inventoryUpdate.nextUnits,
          stock: inventoryUpdate.nextStock,
        })
        .eq("product_id", inventoryUpdate.productId);

      if (inventoryError) {
        const rollbackResults = await Promise.all([
          ...appliedInventoryUpdates.map((appliedUpdate) =>
            supabaseAdmin
              .from("productos")
              .update({
                unidades: appliedUpdate.originalUnits,
                stock: appliedUpdate.originalStock,
              })
              .eq("product_id", appliedUpdate.productId)
          ),
          supabaseAdmin.from("pedidos").delete().eq("id", data.id),
          supabaseAdmin
            .from("clientes")
            .update({ compras: Number(clientAfterPurchase.compras || 0) })
            .eq("id", clientId),
        ]);

        const rollbackFailed = rollbackResults.some(
          (result) => result.error
        );
        if (rollbackFailed) {
          console.error(
            "Orders inventory rollback failed:",
            rollbackResults.map((result) => result.error).filter(Boolean)
          );
        }

        if (clientWasCreated) {
          await supabaseAdmin.from("clientes").delete().eq("id", clientId);
        }

        return NextResponse.json(
          {
            error:
              "No se pudo descontar el inventario. El pedido fue cancelado para proteger el stock.",
          },
          { status: 500 }
        );
      }

      appliedInventoryUpdates.push(inventoryUpdate);
    }

    await revalidateStore();

    return NextResponse.json({ order: data }, { status: 201 });
  } catch (err) {
    console.error("Orders POST error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/orders — Update order status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return NextResponse.json(
        { error: "ID y estado son requeridos" },
        { status: 400 }
      );
    }

    const validStatuses = ["entregado"];
    if (!validStatuses.includes(estado)) {
      return NextResponse.json(
        {
          error:
            "Supabase actualmente solo permite el estado 'entregado' para pedidos.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .update({ estado })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    console.error("Orders PATCH error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
