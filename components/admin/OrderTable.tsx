"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Pedido } from "@/types/database.types";
import { formatDateTime } from "@/lib/utils";

export default function OrderTable() {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [pagoFilter, setPagoFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (estadoFilter !== "all") params.set("estado", estadoFilter);
        if (pagoFilter !== "all") params.set("metodo_pago", pagoFilter);
        params.set("page", page.toString());
        params.set("limit", PAGE_SIZE.toString());

        const res = await fetch(`/api/admin/orders?${params}`);
        const data = await res.json();

        if (cancelled) return;
        setOrders(data.orders || []);
        setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
      } catch {
        if (!cancelled) toast.error("Error al cargar pedidos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [search, estadoFilter, pagoFilter, page, PAGE_SIZE]);

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: "bg-admin-warning/10 text-admin-warning",
      entregado: "bg-admin-success/10 text-admin-success",
      cancelado: "bg-admin-danger/10 text-admin-danger",
      "en camino": "bg-blue-500/10 text-blue-400",
    };
    return map[estado] || "bg-admin-surface-2 text-admin-text-muted";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-admin-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="flex-1 admin-field rounded-lg px-4 py-2.5 text-sm placeholder-admin-text-muted focus:outline-none focus:border-admin-gold transition-colors"
        />
        <select
          value={estadoFilter}
          onChange={(e) => {
            setEstadoFilter(e.target.value);
            setPage(0);
          }}
          className="admin-field rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-admin-gold"
        >
          <option value="all">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="entregado">Entregado</option>
          <option value="en camino">En camino</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select
          value={pagoFilter}
          onChange={(e) => {
            setPagoFilter(e.target.value);
            setPage(0);
          }}
          className="admin-field rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-admin-gold"
        >
          <option value="all">Todos los pagos</option>
          <option value="Nequi">Nequi</option>
          <option value="Daviplata">Daviplata</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Contraentrega">Contraentrega</option>
        </select>
        <Link
          href="/admin/pedidos/nuevo"
          className="rounded-lg bg-admin-gold px-5 py-2.5 text-center text-sm font-bold text-admin-bg transition-colors hover:bg-admin-gold-light"
        >
          + Nuevo Pedido
        </Link>
      </div>

      {/* Table */}
      <div className="admin-data-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border admin-table-head">
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Cliente
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Total
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Pago
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-admin-text-muted"
                  >
                    No se encontraron pedidos
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-admin-border admin-table-head/50 hover:bg-admin-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-admin-text-muted text-xs font-mono">
                      {order.id}
                    </td>
                    <td className="px-4 py-3 text-admin-text-muted text-xs">
                      {formatDateTime(order.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-admin-text text-sm">
                        {order.cliente_nombre}
                      </p>
                      <p className="text-xs text-admin-text-muted">
                        {order.cliente_telefono}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-admin-text">
                      ${order.total?.toLocaleString("es-CO") || "0"}
                    </td>
                    <td className="px-4 py-3 text-admin-text-muted text-sm">
                      {order.metodo_pago || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${estadoBadge(
                          order.estado
                        )}`}
                      >
                        {order.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-admin-gold hover:text-admin-gold-light text-xs font-medium transition-colors"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-admin-border">
            <p className="text-xs text-admin-text-muted">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-admin-surface-2 border border-admin-border rounded text-xs text-admin-text disabled:opacity-50 disabled:cursor-not-allowed hover:border-admin-gold/30 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 bg-admin-surface-2 border border-admin-border rounded text-xs text-admin-text disabled:opacity-50 disabled:cursor-not-allowed hover:border-admin-gold/30 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
