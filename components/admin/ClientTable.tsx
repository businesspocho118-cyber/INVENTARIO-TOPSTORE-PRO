"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Cliente } from "@/types/database.types";

export default function ClientTable() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("page", page.toString());
        params.set("limit", PAGE_SIZE.toString());

        const res = await fetch(`/api/admin/clients?${params}`);
        const data = await res.json();

        if (cancelled) return;
        setClients(data.clients || []);
        setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
      } catch {
        if (!cancelled) toast.error("Error al cargar clientes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchClients();

    return () => {
      cancelled = true;
    };
  }, [search, page, PAGE_SIZE]);

  const fidelidadBadge = (nivel: string) => {
    const map: Record<string, string> = {
      New: "bg-gray-500/10 text-gray-400 border-gray-500/30",
      Active: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      Silver: "bg-gray-300/10 text-gray-300 border-gray-300/30",
      Gold: "bg-admin-gold/10 text-admin-gold border-admin-gold/30",
    };
    return map[nivel] || "bg-admin-surface-2 text-admin-text-muted border-admin-border";
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
      {/* Search */}
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
      </div>

      {/* Table */}
      <div className="admin-data-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border admin-table-head">
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Teléfono
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Dirección
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Compras
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Fidelidad
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Último pago
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-admin-text-muted"
                  >
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-admin-border admin-table-head/50 hover:bg-admin-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-admin-text">
                      {client.nombre}
                    </td>
                    <td className="px-4 py-3 text-admin-text-muted">
                      {client.telefono || "-"}
                    </td>
                    <td className="px-4 py-3 text-admin-text-muted max-w-48 truncate">
                      {client.direccion || "-"}
                    </td>
                    <td className="px-4 py-3 text-admin-text font-semibold">
                      {client.compras}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium border ${fidelidadBadge(
                          client.nivel_fidelidad
                        )}`}
                      >
                        {client.nivel_fidelidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-admin-text-muted text-sm">
                      {client.ultimo_metodo_pago || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clientes/${client.id}`}
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
