"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductInput,
} from "@/lib/products";
import type { Product } from "@/types/product";

export type ProductMutationResult =
  | { ok: true; data: Product }
  | { ok: false; error: string };

export type DeleteProductResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateProducts() {
  revalidatePath("/products");
}

export async function createProductAction(
  input: ProductInput,
): Promise<ProductMutationResult> {
  try {
    const data = await createProduct(input);
    revalidateProducts();
    return { ok: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de créer le produit";
    return { ok: false, error: message };
  }
}

export async function updateProductAction(
  id: string,
  input: ProductInput,
): Promise<ProductMutationResult> {
  try {
    const data = await updateProduct(id, input);
    revalidateProducts();
    return { ok: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de modifier le produit";
    return { ok: false, error: message };
  }
}

export async function deleteProductAction(
  id: string,
): Promise<DeleteProductResult> {
  try {
    await deleteProduct(id);
    revalidateProducts();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de supprimer le produit";
    return { ok: false, error: message };
  }
}
