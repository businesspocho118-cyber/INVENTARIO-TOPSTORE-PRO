import { getColorHex, slugifyColor } from "@/lib/utils";

interface ColorSwatchProps {
  colorName: string;
  size?: number;
}

export function ColorSwatch({ colorName, size = 16 }: ColorSwatchProps) {
  const hex = getColorHex(colorName);
  const normalizedName = colorName.trim();
  return (
    <span
      className="inline-block rounded-full border border-black/15"
      style={{
        width: size,
        height: size,
        backgroundColor: hex,
      }}
      title={normalizedName}
    />
  );
}

export function ColorLabel({ colorName }: { colorName: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ColorSwatch colorName={colorName} />
      <span>{colorName}</span>
    </span>
  );
}