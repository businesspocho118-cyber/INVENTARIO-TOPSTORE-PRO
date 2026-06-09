"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import toast from "react-hot-toast";
import FidelidadProgress from "@/components/admin/FidelidadProgress";
import type { Cliente } from "@/types/database.types";

export default function FidelidadPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "discount" | "near">("all");

  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        const res = await fetch("/api/admin/clients?fidelidad=true&limit=200");
        const data = await res.json();

        if (cancelled) return;
        setClients(data.clients || []);
      } catch {
        if (!cancelled) toast.error("Error al cargar datos de fidelidad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchClients();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading && pageRef.current) {
      gsap.from(pageRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, [loading]);

  const filteredClients = clients.filter((c) => {
    if (filter === "discount") return c.compras >= 7;
    if (filter === "near") return c.compras >= 5 && c.compras < 7;
    return true;
  });

  const stats = {
    withDiscount: clients.filter((c) => c.compras >= 7).length,
    nearDiscount: clients.filter((c) => c.compras === 6).length,
    twoAway: clients.filter((c) => c.compras === 5).length,
  };

  const handleWhatsApp = (client: Cliente) => {
    const phone = client.telefono?.replace(/\D/g, "") || "";
    if (!phone) {
      toast.error("Este cliente no tiene teléfono registrado");
      return;
    }
    const message = encodeURIComponent(
      `¡Hola ${client.nombre}! 🎉 Eres parte de nuestros clientes especiales de TOPSTORE.\nHas completado tus compras para recibir un descuento exclusivo en tu próxima compra.\n¡Escríbenos para que te lo apliquemos! 💛`
    );
    window.open(`https://wa.me/57${phone}?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-admin-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={pageRef} className="admin-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-admin-text">
          Programa de Fidelidad
        </h1>
        <p className="text-admin-text-muted mt-1">
          Gestiona los descuentos por fidelidad de tus clientes
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-admin-gold/5 border border-admin-gold/20 rounded-xl p-5">
        <p className="text-sm text-admin-text">
          <span className="text-admin-gold font-semibold">Cómo funciona:</span>{" "}
          El programa cuenta compras a partir de la primera. Al llegar a{" "}
          <span className="font-semibold text-admin-gold">7 compras</span>, el
          cliente recibe un descuento especial en su próxima compra. El
          descuento se gestiona manualmente vía WhatsApp.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-admin-surface rounded-xl border border-admin-border p-5">
          <p className="text-sm text-admin-text-muted mb-1">
            Con descuento disponible
          </p>
          <p className="text-3xl font-bold text-admin-gold">
            {stats.withDiscount}
          </p>
          <p className="text-xs text-admin-text-muted mt-1">
            Clientes con 7+ compras
          </p>
        </div>
        <div className="bg-admin-surface rounded-xl border border-admin-border p-5">
          <p className="text-sm text-admin-text-muted mb-1">
            A 1 compra del descuento
          </p>
          <p className="text-3xl font-bold text-admin-warning">
            {stats.nearDiscount}
          </p>
          <p className="text-xs text-admin-text-muted mt-1">
            Clientes con 6 compras
          </p>
        </div>
        <div className="bg-admin-surface rounded-xl border border-admin-border p-5">
          <p className="text-sm text-admin-text-muted mb-1">
            A 2 compras del descuento
          </p>
          <p className="text-3xl font-bold text-blue-400">
            {stats.twoAway}
          </p>
          <p className="text-xs text-admin-text-muted mt-1">
            Clientes con 5 compras
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Todos" },
          { key: "discount", label: "Con descuento" },
          { key: "near", label: "Cerca del descuento (5-6)" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-admin-gold text-admin-bg"
                : "bg-admin-surface-2 border border-admin-border text-admin-text-muted hover:text-admin-text hover:border-admin-gold/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Client List */}
      <div className="bg-admin-surface rounded-xl border border-admin-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="text-left px-4 py-3 text-admin-text-muted font-medium">
                  Cliente
                </th>
                <th className="text-left px-4 py-3 text-admin-text-muted font-medium">
                  Teléfono
                </th>
                <th className="text-left px-4 py-3 text-admin-text-muted font-medium">
                  Compras
                </th>
                <th className="text-left px-4 py-3 text-admin-text-muted font-medium">
                  Progreso
                </th>
                <th className="text-left px-4 py-3 text-admin-text-muted font-medium">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-admin-text-muted font-medium">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-admin-text-muted"
                  >
                    No hay clientes en esta categoría
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-admin-border/50 hover:bg-admin-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-admin-text">
                      {client.nombre}
                    </td>
                    <td className="px-4 py-3 text-admin-text-muted">
                      {client.telefono || "-"}
                    </td>
                    <td className="px-4 py-3 text-admin-text font-semibold">
                      {client.compras}
                    </td>
                    <td className="px-4 py-3 min-w-48">
                      <FidelidadProgress
                        current={client.compras}
                        size="sm"
                        showLabel={true}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {client.compras >= 7 ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-admin-gold/10 text-admin-gold border border-admin-gold/30 badge-gold-pulse">
                          ¡Descuento disponible!
                        </span>
                      ) : client.compras >= 5 ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-admin-warning/10 text-admin-warning border border-admin-warning/30">
                          Cerca del descuento
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-admin-surface-2 text-admin-text-muted border border-admin-border">
                          {client.nivel_fidelidad}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {client.compras >= 7 ? (
                        <button
                          onClick={() => handleWhatsApp(client)}
                          className="inline-flex items-center gap-1.5 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/30 font-medium px-3 py-1.5 rounded-lg text-xs transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Notificar
                        </button>
                      ) : (
                        <span className="text-xs text-admin-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
