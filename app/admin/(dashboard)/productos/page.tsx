"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ProductTable from "@/components/admin/ProductTable";

export default function ProductosPage() {
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
        <h1 className="text-2xl font-bold text-admin-text">Productos</h1>
        <p className="text-admin-text-muted mt-1">
          Gestiona el inventario de la tienda
        </p>
      </div>
      <ProductTable />
    </div>
  );
}
