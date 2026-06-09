"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ProductForm from "@/components/admin/ProductForm";

export default function NuevoProductoPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageRef.current) {
      gsap.from(pageRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, []);

  return (
    <div ref={pageRef} className="admin-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-admin-text">
          Nuevo Producto
        </h1>
        <p className="text-admin-text-muted mt-1">
          Agrega un producto al inventario
        </p>
      </div>
      <div className="bg-admin-surface rounded-xl border border-admin-border p-6">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
