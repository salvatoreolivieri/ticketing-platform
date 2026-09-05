import type { InventoryClient } from "../application/ports";

/** Real Inventory client over HTTP. Network/timeout failures surface as status 500. */
export class HttpInventoryClient implements InventoryClient {
  constructor(private readonly baseUrl: string) {}

  async reserve(
    tierId: string,
    quantity: number,
  ): Promise<{ status: number; data?: { orderId: string; eventId: string } }> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/reserves/${encodeURIComponent(tierId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const body = (await resp.json().catch(() => undefined)) as
        | { data?: { orderId: string; eventId: string } }
        | undefined;
      return { status: resp.status, data: body?.data };
    } catch {
      return { status: 500 };
    }
  }
}
