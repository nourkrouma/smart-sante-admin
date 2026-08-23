import type { ProductColor, ProductColorType } from "@/types/product";

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

/** Normalize to `#RRGGBB` uppercase, or null if invalid. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) return null;

  const raw = trimmed.slice(1);
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;

  return `#${expanded.toUpperCase()}`;
}

export function createProductColor(
  value: string,
  type?: ProductColorType,
): ProductColor | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (type === "hex" || (!type && isHexColor(trimmed))) {
    const hex = normalizeHexColor(trimmed);
    if (!hex) return null;
    return { type: "hex", value: hex };
  }

  return { type: "text", value: trimmed };
}

export function parseProductColors(value: unknown): ProductColor[] {
  if (!Array.isArray(value)) return [];

  const colors: ProductColor[] = [];

  for (const item of value) {
    if (typeof item === "string") {
      const color = createProductColor(item);
      if (color) colors.push(color);
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const rawType = record.type;
    const rawValue = record.value;

    if (typeof rawValue !== "string") continue;

    const type: ProductColorType | undefined =
      rawType === "hex" || rawType === "text" ? rawType : undefined;

    const color = createProductColor(rawValue, type);
    if (color) colors.push(color);
  }

  return colors;
}

export function normalizeProductColors(colors: ProductColor[]): ProductColor[] {
  const normalized: ProductColor[] = [];

  for (const color of colors) {
    const next = createProductColor(color.value, color.type);
    if (!next) continue;

    const exists = normalized.some(
      (item) =>
        item.type === next.type &&
        item.value.toLowerCase() === next.value.toLowerCase(),
    );
    if (!exists) normalized.push(next);
  }

  return normalized;
}
