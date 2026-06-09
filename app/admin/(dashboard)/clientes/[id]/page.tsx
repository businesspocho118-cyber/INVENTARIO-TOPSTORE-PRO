"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import toast from "react-hot-toast";
import type { Cliente, Pedido } from "@/types/database.types";
import { formatDateTime } from "@/lib/utils";

export default function ClienteDetallePage() {
  const params = useParams();
  const clientId = params.id as string;
  const pageRef = useRef<HTMLDivElement>(null);
  const [client, setClient] = useState<Cliente | null>(null);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    referencias: "",
  });

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/admin/clients?id=${clientId}`);
        const data = await res.json();
        if (data.client) {
          setClient(data.client);
          setEditForm({
            nombre: data.client.nombre || "",
            telefono: data.client.telefono || "",
            direccion: data.client.direccion || "",
            referencias: data.client.referencias || "",
          });
        }
        if (data.orders) {
          setOrders(data.orders);
        }
      } catch {
        toast.error("Error al cargar cliente");
      } finally {
        setLoading(false);
      }
    }
    fetchClient();
  }, [clientId]);

  useEffect(() => {
    if (!loading && client && pageRef.current) {
      gsap.from(pageRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, [loading, client]);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(clientId), ...editForm }),
      });
      if (res.ok) {
        toast.success("Cliente actualizado");
        setClient((prev) =>
          prev ? { ...prev, ...editForm } : null
        );
        setEditing(false);
      } else {
        toast.error("Error al actualizar cliente");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const fidelidadBadge = (nivel: string) => {
    const map: Record<string, string> = {
      New: "bg-gray-500/10 text-gray-400 border-gray-500/30",
      Active: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      Silver: "bg-gray-300/10 text-gray-300 border-gray-300/30",
      Gold: "bg-admin-gold/10 text-admin-gold border-admin-gold/30",
    };
    return map[nivel] || "bg-admin-surface-2 text-admin-text-muted";
  };

  const fidelidadProgress = () => {
    if (!client) return { percent: 0, current: 0, target: 7, remaining: 7 };
    const compras = client.compras;
    const target = 7;
    const percent = Math.min((compras / target) * 100, 100);
    const remaining = Math.max(target - compras, 0);
    return { percent, current: compras, target, remaining };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-admin-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20 text-admin-text-muted">
        Cliente no encontrado
      </div>
    );
  }

  const fidelidad = fidelidadProgress();

  return (
    <div ref={pageRef} className="admin-page space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-text">
            {client.nombre}
          </h1>
          <p className="text-admin-text-muted mt-1">Cliente #{client.id}</p>
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-full font-medium border ${fidelidadBadge(
            client.nivel_fidelidad
          )}`}
        >
          {client.nivel_fidelidad}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-admin-text">
              Información
            </h2>
            <button
              onClick={() => setEditing(!editing)}
              className="text-xs text-admin-gold hover:text-admin-gold-light font-medium transition-colors"
            >
              {editing ? "Cancelar" : "Editar"}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-admin-text-muted">Nombre</label>
                <input
                  value={editForm.nombre}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nombre: e.target.value })
                  }
                  className="w-full bg-admin-surface-2 border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                />
              </div>
              <div>
                <label className="text-xs text-admin-text-muted">Teléfono</label>
                <input
                  value={editForm.telefono}
                  onChange={(e) =>
                    setEditForm({ ...editForm, telefono: e.target.value })
                  }
                  className="w-full bg-admin-surface-2 border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                />
              </div>
              <div>
                <label className="text-xs text-admin-text-muted">Dirección</label>
                <input
                  value={editForm.direccion}
                  onChange={(e) =>
                    setEditForm({ ...editForm, direccion: e.target.value })
                  }
                  className="w-full bg-admin-surface-2 border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text focus:outline-none focus:border-admin-gold"
                />
              </div>
              <div>
                <label className="text-xs text-admin-text-muted">Referencias</label>
                <textarea
                  value={editForm.referencias}
                  onChange={(e) =>
                    setEditForm({ ...editForm, referencias: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-admin-surface-2 border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text focus:outline-none focus:border-admin-gold resize-none"
                />
              </div>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full bg-admin-gold hover:bg-admin-gold-light text-admin-bg font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-admin-text-muted">Teléfono</span>
                <p className="text-sm text-admin-text">
                  {client.telefono || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-admin-text-muted">Dirección</span>
                <p className="text-sm text-admin-text">
                  {client.direccion || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-admin-text-muted">Referencias</span>
                <p className="text-sm text-admin-text">
                  {client.referencias || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-admin-text-muted">
                  Último método de pago
                </span>
                <p className="text-sm text-admin-text">
                  {client.ultimo_metodo_pago || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-admin-text-muted">
                  Total de compras
                </span>
                <p className="text-sm text-admin-text font-semibold">
                  {client.compras}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fidelidad Progress */}
        <div className="lg:col-span-2 bg-admin-surface rounded-xl border border-admin-border p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">
            Progreso de Fidelidad
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-admin-text-muted">
                {fidelidad.current} de {fidelidad.target} compras
              </span>
              <span className="text-sm font-medium text-admin-gold">
                {fidelidad.remaining > 0
                  ? `Faltan ${fidelidad.remaining} para descuento`
                  : "¡Descuento disponible!"}
              </span>
            </div>
            <div className="w-full bg-admin-surface-2 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  fidelidad.percent >= 100
                    ? "bg-admin-gold"
                    : "bg-admin-gold/60"
                }`}
                style={{ width: `${fidelidad.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-admin-text-muted">
              <span>0</span>
              <span>Active (1)</span>
              <span>Silver (4)</span>
              <span>Gold (7) 🎉</span>
            </div>

            {fidelidad.percent >= 100 && (
              <div className="bg-admin-gold/10 border border-admin-gold/30 rounded-lg p-4 text-center">
                <p className="text-admin-gold font-semibold text-sm">
                  ¡Este cliente tiene descuento disponible!
                </p>
                <p className="text-admin-text-muted text-xs mt-1">
                  Gestiona el descuento desde el panel de Fidelidad
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
        <h2 className="text-lg font-semibold text-admin-text mb-4">
          Historial de Pedidos ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="text-admin-text-muted text-sm text-center py-8">
            No hay pedidos registrados para este cliente
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between bg-admin-surface-2 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-admin-text">
                    Pedido #{order.id}
                  </p>
                  <p className="text-xs text-admin-text-muted">
                    {formatDateTime(order.fecha)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      order.estado === "pendiente"
                        ? "bg-admin-warning/10 text-admin-warning"
                        : order.estado === "entregado"
                        ? "bg-admin-success/10 text-admin-success"
                        : order.estado === "cancelado"
                        ? "bg-admin-danger/10 text-admin-danger"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {order.estado}
                  </span>
                  <span className="text-sm font-semibold text-admin-text">
                    ${order.total?.toLocaleString("es-CO") || "0"}
                  </span>
                  <a
                    href={`/admin/pedidos/${order.id}`}
                    className="text-xs text-admin-gold hover:text-admin-gold-light transition-colors"
                  >
                    Ver
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
