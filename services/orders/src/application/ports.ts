/** The one thing Orders calls out to: Inventory's reserve endpoint. */
export interface InventoryClient {
  reserve(
    tierId: string,
    quantity: number,
  ): Promise<{ status: number; data?: { orderId: string; eventId: string } }>;
}
