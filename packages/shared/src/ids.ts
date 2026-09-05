/** Stable, human-readable id renderers shared by the seed and every service. */
export const pad = (n: number, width = 5): string => String(n).padStart(width, "0");

export const eventId = (n: number): string => `evt_${pad(n)}`;
export const venueId = (n: number): string => `ven_${pad(n)}`;
export const organizerId = (n: number): string => `org_${pad(n)}`;
export const tierId = (n: number): string => `tier_${pad(n)}`;
export const orderId = (n: number): string => `ord_${pad(n)}`;
export const ticketId = (n: number): string => `tkt_${pad(n)}`;
