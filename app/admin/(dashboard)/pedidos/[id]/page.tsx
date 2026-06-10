"use client";

export const runtime = "edge";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import gsap from "gsap";
import toast from "react-hot-toast";
import type { Pedido } from "@/types/database.types";
import { formatDateTime } from "@/lib/utils";

export default function PedidoDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const pageRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: string;
  }>({ open: false, action: "" });

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/admin/orders?id=${id}`);
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
        }
      } catch {
        toast.error("Error al cargar pedido");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!loading && order && pageRef.current) {
      gsap.from(pageRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, [loading, order]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id), estado: newStatus }),
      });

      if (res.ok) {
        toast.success(`Pedido marcado como ${newStatus}`);
        setOrder((prev) => (prev ? { ...prev, estado: newStatus as Pedido["estado"] } : null));
        setConfirmModal({ open: false, action: "" });
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al actualizar estado");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating(false);
    }
  };

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: "bg-admin-warning/10 text-admin-warning border-admin-warning/30",
      entregado: "bg-admin-success/10 text-admin-success border-admin-success/30",
      cancelado: "bg-admin-danger/10 text-admin-danger border-admin-danger/30",
      "en camino": "bg-blue-500/10 text-blue-400 border-blue-500/30",
    };
    return map[estado] || "bg-admin-surface-2 text-admin-text-muted border-admin-border";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-admin-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-admin-text-muted">
        Pedido no encontrado
      </div>
    );
  }

  return (
    <div ref={pageRef} className="admin-page space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-text">
            Pedido #{order.id}
          </h1>
          <p className="text-admin-text-muted mt-1">
            {formatDateTime(order.fecha)}
          </p>
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-full font-medium border ${estadoBadge(
            order.estado
          )}`}
        >
          {order.estado}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">
            Cliente
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-admin-text-muted">Nombre</span>
              <p className="text-sm text-admin-text">{order.cliente_nombre}</p>
            </div>
            {order.cliente_telefono && (
              <div>
                <span className="text-xs text-admin-text-muted">Teléfono</span>
                <p className="text-sm text-admin-text">
                  {order.cliente_telefono}
                </p>
              </div>
            )}
            {order.cliente_direccion && (
              <div>
                <span className="text-xs text-admin-text-muted">Dirección</span>
                <p className="text-sm text-admin-text">
                  {order.cliente_direccion}
                </p>
              </div>
            )}
            {order.cliente_barrio && (
              <div>
                <span className="text-xs text-admin-text-muted">Barrio</span>
                <p className="text-sm text-admin-text">
                  {order.cliente_barrio}
                </p>
              </div>
            )}
            {order.cliente_referencias && (
              <div>
                <span className="text-xs text-admin-text-muted">
                  Referencias
                </span>
                <p className="text-sm text-admin-text">
                  {order.cliente_referencias}
                </p>
              </div>
            )}
            {order.metodo_pago && (
              <div>
                <span className="text-xs text-admin-text-muted">
                  Método de pago
                </span>
                <p className="text-sm text-admin-text">
                  {order.metodo_pago}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="lg:col-span-2 bg-admin-surface rounded-xl border border-admin-border p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">
            Productos del pedido
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-admin-surface-2 rounded-lg px-4 py-3"
              >
                {item.image_path ? (
                  <Image
                    src={item.image_path}
                    alt={item.nombre}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-admin-border flex items-center justify-center text-admin-text-muted text-xs">
                    N/A
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-admin-text">
                    {item.nombre}
                  </p>
                  <p className="text-xs text-admin-text-muted">
                    {[item.color, item.talla].filter(Boolean).join(" · ") || "Sin variante"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-admin-text">
                    {item.precio}
                  </p>
                  <p className="text-xs text-admin-text-muted">
                    x{item.cantidad}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Total + Notes */}
          <div className="mt-4 pt-4 border-t border-admin-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-admin-text-muted">Total</span>
              <span className="text-xl font-bold text-admin-gold">
                ${order.total?.toLocaleString("es-CO") || "0"}
              </span>
            </div>
            {order.notas && (
              <div className="mt-3 bg-admin-surface-2 rounded-lg px-4 py-3">
                <span className="text-xs text-admin-text-muted">Notas</span>
                <p className="text-sm text-admin-text mt-1">{order.notas}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
        <h2 className="text-lg font-semibold text-admin-text mb-4">
          Cambiar estado del pedido
        </h2>
        <p className="mb-4 rounded-lg border border-admin-warning/30 bg-admin-warning/10 px-4 py-3 text-sm text-admin-text-muted">
          La base de datos actual solo permite el estado{" "}
          <span className="font-bold text-admin-text">entregado</span>. Para
          usar pendiente, en camino o cancelado hay que ampliar el constraint en
          Supabase.
        </p>
        {order.estado !== "entregado" ? (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setConfirmModal({ open: true, action: "entregado" })
              }
              disabled={updating}
              className="bg-admin-success/10 hover:bg-admin-success/20 text-admin-success border border-admin-success/30 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              ? Marcar como Entregado
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold text-admin-success">
            Este pedido ya est? entregado.
          </p>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface rounded-xl border border-admin-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-admin-text mb-2">
              Confirmar cambio de estado
            </h3>
            <p className="text-admin-text-muted text-sm mb-6">
              ¿Estás seguro de que quieres cambiar el estado a{" "}
              <span className="font-medium text-admin-text">
                {confirmModal.action}
              </span>
              ?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setConfirmModal({ open: false, action: "" })
                }
                className="px-4 py-2 bg-admin-surface-2 border border-admin-border rounded-lg text-sm text-admin-text hover:border-admin-gold/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateStatus(confirmModal.action)}
                disabled={updating}
                className="px-4 py-2 bg-admin-gold hover:bg-admin-gold-light rounded-lg text-sm text-admin-bg font-medium transition-colors disabled:opacity-50"
              >
                {updating ? "Actualizando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
