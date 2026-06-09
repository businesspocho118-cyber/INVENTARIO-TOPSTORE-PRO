"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import OrderForm from "@/components/admin/OrderForm";

export default function NuevoPedidoPage() {
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
        <h1 className="text-2xl font-bold text-admin-text">Nuevo Pedido</h1>
        <p className="mt-1 text-admin-text-muted">
          Registra un pedido manual y vincúlalo al cliente por teléfono.
        </p>
      </div>
      <OrderForm />
    </div>
  );
}
