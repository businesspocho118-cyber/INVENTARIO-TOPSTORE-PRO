import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidateStore } from "@/lib/utils";

export const runtime = "edge";

function makeIntegerId() {
  return Math.floor(Date.now() % 2_000_000_000);
}

function normalizeGenero(genero: unknown) {
  if (genero === "accesorios") return "accesorios";
  return genero === "mujeres" ? "mujeres" : "hombres";
}

function sumUnits(unidades: unknown) {
  if (!unidades || typeof unidades !== "object") return null;

  return Object.values(unidades as Record<string, unknown>).reduce<number>(
    (sum, value) => sum + Math.max(0, Number(value || 0)),
    0
  );
}

// GET /api/admin/products — List products or get single product
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dashboard = searchParams.get("dashboard");

    // Dashboard endpoint
    if (dashboard === "true") {
      return await getDashboardData();
    }

    // Single product
    const product_id = searchParams.get("product_id");
    if (product_id) {
      const { data, error } = await supabaseAdmin
        .from("productos")
        .select("*")
        .eq("product_id", product_id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ product: data });
    }

    // List products with filters
    const search = searchParams.get("search") || "";
    const genero = searchParams.get("genero") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = page * limit;

    let query = supabaseAdmin
      .from("productos")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("nombre", `%${search}%`);
    }
    if (genero) {
      query = query.eq("genero", genero);
    }
    if (status === "activo") {
      query = query.eq("activo", true);
    } else if (status === "inactivo") {
      query = query.eq("activo", false);
    } else if (status === "agotado") {
      query = query.eq("stock", 0);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [], total: count || 0 });
  } catch (err) {
    console.error("Products GET error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/admin/products — Create product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stockFromUnits = sumUnits(body.unidades);

    const { data, error } = await supabaseAdmin
      .from("productos")
      .insert({
        id: makeIntegerId(),
        product_id: body.product_id,
        nombre: body.nombre,
        descripcion: body.descripcion || null,
        precio: body.precio,
        colores: body.colores || null,
        genero: normalizeGenero(body.genero),
        categoria: body.categoria || null,
        image_paths: body.image_paths || [],
        stock: stockFromUnits ?? body.stock,
        activo: body.activo ?? true,
        tallas: body.tallas || null,
        unidades: body.unidades || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Revalidate store
    await revalidateStore();

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    console.error("Products POST error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products — Update product
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const stockFromUnits = sumUnits(body.unidades);

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion || null;
    if (body.precio !== undefined) updateData.precio = body.precio;
    if (body.colores !== undefined) updateData.colores = body.colores || null;
    if (body.genero !== undefined) updateData.genero = normalizeGenero(body.genero);
    if (body.categoria !== undefined) updateData.categoria = body.categoria || null;
    if (body.image_paths !== undefined) updateData.image_paths = body.image_paths;
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.tallas !== undefined) updateData.tallas = body.tallas || null;
    if (body.unidades !== undefined) {
      updateData.unidades = body.unidades;
      updateData.stock = stockFromUnits ?? body.stock ?? 0;
    }

    const { data, error } = await supabaseAdmin
      .from("productos")
      .update(updateData)
      .eq("product_id", body.product_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Revalidate store
    await revalidateStore();

    return NextResponse.json({ product: data });
  } catch (err) {
    console.error("Products PUT error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/products — Partial update (toggle activo, etc)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.stock !== undefined) updateData.stock = body.stock;

    const { data, error } = await supabaseAdmin
      .from("productos")
      .update(updateData)
      .eq("product_id", body.product_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Revalidate store
    await revalidateStore();

    return NextResponse.json({ product: data });
  } catch (err) {
    console.error("Products PATCH error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products — Delete product
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    const { error } = await supabaseAdmin
      .from("productos")
      .delete()
      .eq("product_id", body.product_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Revalidate store
    await revalidateStore();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Products DELETE error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Dashboard data helper
async function getDashboardData() {
  const [
    productosActivos,
    productosAgotados,
    totalPedidos,
    pedidosPendientes,
    totalClientes,
    ventasTotales,
    recentOrders,
    chartData,
    lowStock,
  ] = await Promise.all([
    supabaseAdmin
      .from("productos")
      .select("*", { count: "exact", head: true })
      .eq("activo", true),
    supabaseAdmin
      .from("productos")
      .select("*", { count: "exact", head: true })
      .eq("stock", 0),
    supabaseAdmin
      .from("pedidos")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("pedidos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    supabaseAdmin
      .from("clientes")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin.from("pedidos").select("total"),
    supabaseAdmin
      .from("pedidos")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("pedidos")
      .select("fecha")
      .gte(
        "fecha",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
    supabaseAdmin
      .from("productos")
      .select("nombre, stock")
      .lte("stock", 3)
      .limit(10),
  ]);

  // Calculate total sales
  const salesTotal =
    ventasTotales.data?.reduce((sum, p) => sum + (Number(p.total) || 0), 0) ||
    0;

  // Group chart data by date
  const groupedByDate: Record<string, number> = {};
  chartData.data?.forEach((p) => {
    const date = new Date(p.fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
    });
    groupedByDate[date] = (groupedByDate[date] || 0) + 1;
  });

  const chart = Object.entries(groupedByDate).map(([date, pedidos]) => ({
    date,
    pedidos,
  }));

  return NextResponse.json({
    metrics: {
      total_productos_activos: productosActivos.count || 0,
      productos_agotados: productosAgotados.count || 0,
      total_pedidos: totalPedidos.count || 0,
      pedidos_pendientes: pedidosPendientes.count || 0,
      total_clientes: totalClientes.count || 0,
      ventas_totales: salesTotal,
    },
    recentOrders: recentOrders.data || [],
    chartData: chart,
    lowStockProducts: lowStock.data || [],
  });
}
