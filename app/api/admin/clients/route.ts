import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/admin/clients — List clients or get single client
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Single client by id
    const id = searchParams.get("id");
    if (id) {
      const { data: client, error } = await supabaseAdmin
        .from("clientes")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Cliente no encontrado" },
          { status: 404 }
        );
      }

      // Get orders for this client
      const { data: orders } = await supabaseAdmin
        .from("pedidos")
        .select("*")
        .or(`cliente_id.eq.${client.id},cliente_telefono.eq.${client.telefono}`)
        .order("fecha", { ascending: false });

      return NextResponse.json({
        client,
        orders: orders || [],
      });
    }

    // List clients
    const search = searchParams.get("search") || "";
    const fidelidad = searchParams.get("fidelidad") || "";
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = page * limit;

    let query = supabaseAdmin
      .from("clientes")
      .select("*", { count: "exact" })
      .order("compras", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,telefono.ilike.%${search}%`
      );
    }

    // If fidelidad mode, get all sorted by compras
    if (fidelidad === "true") {
      query = supabaseAdmin
        .from("clientes")
        .select("*", { count: "exact" })
        .order("compras", { ascending: false })
        .limit(parseInt(searchParams.get("limit") || "200"));
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data || [], total: count || 0 });
  } catch (err) {
    console.error("Clients GET error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/clients — Update client info
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del cliente es requerido" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "nombre",
      "telefono",
      "direccion",
      "referencias",
      "ultimo_metodo_pago",
    ];
    const filteredData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    }

    const { data, error } = await supabaseAdmin
      .from("clientes")
      .update(filteredData)
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ client: data });
  } catch (err) {
    console.error("Clients PATCH error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
