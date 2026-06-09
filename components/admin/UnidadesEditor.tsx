"use client";

import { useMemo } from "react";
import { ColorLabel } from "./ColorSwatch";

interface UnidadesEditorProps {
  colores: string;
  tallas: string;
  unidades: Record<string, number>;
  onChange: (unidades: Record<string, number>) => void;
}

export default function UnidadesEditor({
  colores,
  tallas,
  unidades,
  onChange,
}: UnidadesEditorProps) {
  const colorList = useMemo(
    () =>
      colores
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [colores]
  );
  const tallaList = useMemo(
    () =>
      tallas
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tallas]
  );

  const getValue = (color: string, talla: string): number => {
    const key = `${color}-${talla}`;
    return unidades[key] || 0;
  };

  const getVisibleUnits = () => {
    const visible: Record<string, number> = {};
    for (const color of colorList) {
      for (const talla of tallaList) {
        const key = `${color}-${talla}`;
        visible[key] = Math.max(0, Number(unidades[key] || 0));
      }
    }
    return visible;
  };

  const setValue = (color: string, talla: string, value: number) => {
    const key = `${color}-${talla}`;
    const updated = { ...getVisibleUnits(), [key]: Math.max(0, value) };
    onChange(updated);
  };

  const totalUnidades = useMemo(() => {
    return colorList.reduce(
      (sum, color) =>
        sum +
        tallaList.reduce((rowSum, talla) => {
          const key = `${color}-${talla}`;
          return rowSum + Math.max(0, Number(unidades[key] || 0));
        }, 0),
      0
    );
  }, [colorList, tallaList, unidades]);

  if (colorList.length === 0 || tallaList.length === 0) {
    return (
      <div className="bg-admin-surface-2 border border-admin-border rounded-lg p-4 text-center">
        <p className="text-sm text-admin-text-muted">
          Ingresa colores y tallas para configurar las unidades por combinación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-admin-text-muted">
          Unidades por Color + Talla
        </label>
        <span className="text-xs text-admin-gold font-medium">
          Total: {totalUnidades} uds
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-admin-text-muted font-medium border-b border-admin-border">
                Color
              </th>
              {tallaList.map((talla) => (
                <th
                  key={talla}
                  className="text-center px-3 py-2 text-admin-text-muted font-medium border-b border-admin-border"
                >
                  {talla}
                </th>
              ))}
              <th className="text-center px-3 py-2 text-admin-text-muted font-medium border-b border-admin-border">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {colorList.map((color) => {
              const rowTotal = tallaList.reduce(
                (sum, t) => sum + getValue(color, t),
                0
              );
              return (
                <tr
                  key={color}
                  className="border-b border-admin-border/30"
                >
                  <td className="px-3 py-2 text-admin-text font-medium">
                    <ColorLabel colorName={color} />
                  </td>
                  {tallaList.map((talla) => (
                    <td key={talla} className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={getValue(color, talla)}
                        onChange={(e) =>
                          setValue(
                            color,
                            talla,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 bg-admin-bg border border-admin-border rounded px-2 py-1 text-center text-admin-text focus:outline-none focus:border-admin-gold text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center text-admin-gold font-semibold">
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
