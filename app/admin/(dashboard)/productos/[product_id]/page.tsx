"use client";

export const runtime = "edge";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import ProductForm from "@/components/admin/ProductForm";
import type { Producto } from "@/types/database.types";

export default function EditarProductoPage() {
  const params = useParams();
  const product_id = params.product_id as string;
  const pageRef = useRef<HTMLDivElement>(null);
  const [product, setProduct] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(
          `/api/admin/products?product_id=${product_id}`
        );
        const data = await res.json();
        if (data.product) {
          setProduct(data.product);
        } else {
          setError("Producto no encontrado");
        }
      } catch {
        setError("Error al cargar producto");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [product_id]);

  useEffect(() => {
    if (!loading && product && pageRef.current) {
      gsap.from(pageRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, [loading, product]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-admin-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-20 text-admin-text-muted">
        {error || "Producto no encontrado"}
      </div>
    );
  }

  return (
    <div ref={pageRef} className="admin-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-admin-text">
          Editar Producto
        </h1>
        <p className="text-admin-text-muted mt-1">{product.nombre}</p>
      </div>
      <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
        <ProductForm mode="edit" product={product} />
      </div>
    </div>
  );
}
