"use server";

import { revalidatePath } from "next/cache";
import { updateOrderStatus } from "@/lib/orders";
import {
  isOrderStatus,
  type OrderCollection,
  type OrderStatus,
} from "@/types/order";

export type UpdateOrderStatusResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateOrderStatusAction(
  docId: string,
  status: string,
  collectionName: OrderCollection,
): Promise<UpdateOrderStatusResult> {
  if (!isOrderStatus(status)) {
    return { ok: false, error: "Statut de commande invalide" };
  }

  try {
    await updateOrderStatus(docId, status as OrderStatus, collectionName);
    revalidatePath("/commandes");
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de mettre à jour le statut";
    return { ok: false, error: message };
  }
}
