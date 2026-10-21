export type ProductColorType = "text" | "hex";

export type ProductColor = {
  type: ProductColorType;
  value: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  tags: string[];
  /** Stable category id. Display names live on the category document. */
  category: string;
};
