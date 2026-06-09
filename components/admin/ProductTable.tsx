"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { getFirstImagePath } from "@/lib/utils";
import type { Producto } from "@/types/database.types";

export default function ProductTable() {
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generoFilter, setGeneroFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    product: Producto | null;
  }>({ open: false, product: null });
  const PAGE_SIZE = 15;
  const genderTabs = [
    { value: "all", label: "Todos" },
    { value: "mujeres", label: "Mujer" },
    { value: "hombres", label: "Hombre" },
    { value: "accesorios", label: "Accesorios" },
  ];

  const buildProductParams = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (generoFilter !== "all") params.set("genero", generoFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", page.toString());
    params.set("limit", PAGE_SIZE.toString());
    return params;
  };

  const applyProductsResponse = (data: { products?: Producto[]; total?: number }) => {
    setProducts(data.products || []);
    setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
  };

  const refreshProducts = async () => {
    try {
      const res = await fetch(`/api/admin/products?${buildProductParams()}`);
      const data = await res.json();
      applyProductsResponse(data);
    } catch {
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (generoFilter !== "all") params.set("genero", generoFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        params.set("page", page.toString());
        params.set("limit", PAGE_SIZE.toString());

        const res = await fetch(`/api/admin/products?${params}`);
        const data = await res.json();

        if (cancelled) return;
        setProducts(data.products || []);
        setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
      } catch {
        if (!cancelled) toast.error("Error al cargar productos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [search, generoFilter, statusFilter, page, PAGE_SIZE]);

  const toggleActivo = async (product: Producto) => {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.product_id,
          activo: !product.activo,
        }),
      });

      if (res.ok) {
        toast.success(
          product.activo
            ? "Producto desactivado (no visible en tienda)"
            : "Producto activado (visible en tienda)"
        );
        refreshProducts();
      } else {
        toast.error("Error al cambiar estado");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.product) return;
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: deleteModal.product.product_id }),
      });

      if (res.ok) {
        toast.success("Producto eliminado");
        setDeleteModal({ open: false, product: null });
        refreshProducts();
      } else {
        toast.error("Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const stockColor = (stock: number) => {
    if (stock === 0) return "text-admin-danger";
    if (stock <= 3) return "text-admin-warning";
    return "text-admin-success";
  };

  const stockBg = (stock: number) => {
    if (stock === 0) return "bg-admin-danger/10";
    if (stock <= 3) return "bg-admin-warning/10";
    return "bg-admin-success/10";
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
      <div className="admin-data-card rounded-xl p-4">
        <p className="mb-3 text-sm font-bold text-admin-text">
          Dividir productos por sección
        </p>
        <div className="flex flex-wrap gap-2">
          {genderTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setGeneroFilter(tab.value);
                setPage(0);
              }}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-bold transition ${
                generoFilter === tab.value
                  ? "bg-admin-gold text-admin-bg"
                  : "border border-admin-border bg-admin-surface-2 text-admin-text hover:border-admin-gold/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="flex-1 admin-field rounded-lg px-4 py-2.5 text-sm placeholder-admin-text-muted focus:outline-none focus:border-admin-gold transition-colors"
        />
        <select
          value={generoFilter}
          onChange={(e) => {
            setGeneroFilter(e.target.value);
            setPage(0);
          }}
          className="admin-field rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-admin-gold"
        >
          <option value="all">Todos los géneros</option>
          <option value="hombres">Hombres</option>
          <option value="mujeres">Mujeres</option>
          <option value="accesorios">Accesorios</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="admin-field rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-admin-gold"
        >
          <option value="all">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="agotado">Agotado</option>
        </select>
        <Link
          href="/admin/productos/nuevo"
          className="bg-admin-gold hover:bg-admin-gold-light text-admin-bg font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors text-center"
        >
          + Nuevo Producto
        </Link>
      </div>

      {/* Table */}
      <div className="admin-data-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border admin-table-head">
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Imagen
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Género
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Precio
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Stock
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Activo
                </th>
                <th className="text-left px-4 py-3 text-admin-text font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-admin-text-muted"
                  >
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.product_id}
                    className="border-b border-admin-border admin-table-head/50 hover:bg-admin-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {product.image_paths ? (
                        <Image
                          src={getFirstImagePath(product.image_paths) || "/placeholder.png"}
                          alt={product.nombre}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-admin-surface-2 flex items-center justify-center text-admin-text-muted text-xs">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-admin-text">
                          {product.nombre}
                        </p>
                        <p className="text-xs text-admin-text-muted">
                          {product.product_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-admin-text-muted">
                      {product.genero}
                    </td>
                    <td className="px-4 py-3 font-medium text-admin-text">
                      {product.precio}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`${stockColor(product.stock)} ${stockBg(
                          product.stock
                        )} px-2 py-1 rounded-md text-xs font-semibold`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActivo(product)}
                        className={`toggle-switch ${
                          product.activo ? "active" : ""
                        }`}
                        title={
                          product.activo
                            ? "Desactivar producto"
                            : "Activar producto"
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/productos/${product.product_id}`}
                          className="text-admin-gold hover:text-admin-gold-light text-xs font-medium transition-colors"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() =>
                            setDeleteModal({ open: true, product })
                          }
                          className="text-admin-danger hover:text-red-300 text-xs font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
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

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.product && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface rounded-xl border border-admin-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-admin-text mb-2">
              Confirmar eliminación
            </h3>
            <p className="text-admin-text-muted text-sm mb-6">
              ¿Estás seguro de que quieres eliminar{" "}
              <span className="text-admin-text font-medium">
                {deleteModal.product.nombre}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setDeleteModal({ open: false, product: null })
                }
                className="px-4 py-2 bg-admin-surface-2 border border-admin-border rounded-lg text-sm text-admin-text hover:border-admin-gold/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-admin-danger hover:bg-red-500 rounded-lg text-sm text-white font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
