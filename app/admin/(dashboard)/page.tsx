"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import MetricCard from "@/components/admin/MetricCard";
import {
  Shirt,
  AlertTriangle,
  Package,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardMetrics, Pedido } from "@/types/database.types";

export default function AdminDashboard() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Pedido[]>([]);
  const [chartData, setChartData] = useState<
    { date: string; pedidos: number }[]
  >([]);
  const [lowStockProducts, setLowStockProducts] = useState<
    { nombre: string; stock: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const res = await fetch("/api/admin/products?dashboard=true");
        const data = await res.json();

        if (cancelled) return;
        setMetrics(data.metrics || null);
        setRecentOrders(data.recentOrders || []);
        setChartData(data.chartData || []);
        setLowStockProducts(data.lowStockProducts || []);
      } catch (err) {
        if (!cancelled) console.error("Error loading dashboard:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchDashboard();

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-admin-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20 text-admin-text-muted">
        Error al cargar el dashboard. Verifica la conexión a Supabase.
      </div>
    );
  }

  return (
    <div ref={pageRef} className="admin-page space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-admin-text">Dashboard</h1>
        <p className="text-admin-text-muted mt-1">
          Resumen general de TOPSTORE
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Productos Activos"
          value={metrics.total_productos_activos}
          icon={Shirt}
          color="text-admin-gold"
        />
        <MetricCard
          label="Agotados"
          value={metrics.productos_agotados}
          icon={AlertTriangle}
          color="text-admin-danger"
        />
        <MetricCard
          label="Total Pedidos"
          value={metrics.total_pedidos}
          icon={Package}
          color="text-blue-400"
        />
        <MetricCard
          label="Pendientes"
          value={metrics.pedidos_pendientes}
          icon={Clock}
          color="text-admin-warning"
        />
        <MetricCard
          label="Clientes"
          value={metrics.total_clientes}
          icon={Users}
          color="text-green-400"
        />
        <MetricCard
          label="Ventas Totales"
          value={metrics.ventas_totales}
          icon={DollarSign}
          color="text-admin-gold"
          prefix="$"
        />
      </div>

      {/* Charts + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">
            Pedidos (últimos 30 días)
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis
                  dataKey="date"
                  stroke="#7A7A7A"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#7A7A7A" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#161616",
                    border: "1px solid #2A2A2A",
                    borderRadius: "8px",
                    color: "#F0F0EB",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pedidos"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#C9A84C" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-admin-text-muted text-sm">
              No hay datos de pedidos aún
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">
            Últimos Pedidos
          </h2>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between bg-admin-surface-2 rounded-lg px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-admin-text truncate">
                      {order.cliente_nombre}
                    </p>
                    <p className="text-xs text-admin-text-muted">
                      #{order.id} ·{" "}
                      {new Date(order.fecha).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-admin-text-muted text-sm">
              No hay pedidos aún
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-admin-danger/5 border border-admin-danger/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-admin-danger mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Productos con stock bajo o agotado
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((p) => (
              <div
                key={p.nombre}
                className="bg-admin-surface rounded-lg border border-admin-border px-4 py-3 flex items-center justify-between"
              >
                <span className="text-sm text-admin-text truncate">
                  {p.nombre}
                </span>
                <span
                  className={`text-sm font-bold ${
                    p.stock === 0 ? "text-admin-danger" : "text-admin-warning"
                  }`}
                >
                  {p.stock === 0 ? "Agotado" : `${p.stock} uds`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
