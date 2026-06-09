"use client";

interface FidelidadProgressProps {
  current: number;
  target?: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function FidelidadProgress({
  current,
  target = 7,
  showLabel = true,
  size = "md",
}: FidelidadProgressProps) {
  const percent = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  const hasDiscount = current >= target;

  const height = size === "sm" ? "h-2" : "h-3";

  return (
    <div className="w-full">
      <div className={`w-full bg-admin-surface-2 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ${
            hasDiscount ? "bg-admin-gold" : "bg-admin-gold/60"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-admin-text-muted">
            {current}/{target}
          </span>
          {hasDiscount ? (
            <span className="text-xs text-admin-gold font-semibold">
              ¡Descuento!
            </span>
          ) : (
            <span className="text-xs text-admin-text-muted">
              Faltan {remaining}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
