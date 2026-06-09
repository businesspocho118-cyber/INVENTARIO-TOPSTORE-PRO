"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color?: string;
  prefix?: string;
}

export default function MetricCard({
  label,
  value,
  icon: Icon,
  color = "text-admin-gold",
  prefix = "",
}: MetricCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (numberRef.current && value > 0) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: value,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          if (numberRef.current) {
            numberRef.current.textContent =
              prefix + Math.floor(obj.val).toLocaleString("es-CO");
          }
        },
      });
    }
  }, [value, prefix]);

  return (
    <div
      ref={cardRef}
      className="metric-card bg-admin-surface rounded-xl border border-admin-border p-6 hover:border-admin-gold/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-admin-text-muted mb-1">{label}</p>
          <p className="text-3xl font-bold text-admin-text">
            <span ref={numberRef} className="metric-number">
              {prefix}0
            </span>
          </p>
        </div>
        <div className={`${color} bg-admin-surface-2 rounded-lg p-3`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
