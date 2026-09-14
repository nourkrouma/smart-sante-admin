export type ProductColorType = "text" | "hex";

export type ProductColor = {
  type: ProductColorType;
  value: string;
};

export const PRODUCT_CATEGORIES = [
  "all",
  "homme chaussure orthopedique",
  "femme chaussure orthopedique",
  "paramedical produits",
  "طقم طبي و مازر",
  "tenu de bloc et blouse",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const DEFAULT_PRODUCT_CATEGORY: ProductCategory = "all";

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  all: "Tous",
  "homme chaussure orthopedique": "Homme chaussure orthopédique",
  "femme chaussure orthopedique": "Femme chaussure orthopédique",
  "paramedical produits": "Paramédical produits",
  "طقم طبي و مازر": "طقم طبي و مازر",
  "tenu de bloc et blouse": "Tenu de bloc et blouse",
};

export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  tags: string[];
  category: ProductCategory;
};
