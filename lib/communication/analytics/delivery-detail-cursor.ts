/**
 * SCE-COMM-19 — stable cursor pagination for delivery detail rows.
 */

export type DeliveryDetailCursorPayload = {
  id: string;
};

export function encodeDeliveryDetailCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id } satisfies DeliveryDetailCursorPayload), "utf8").toString(
    "base64url",
  );
}

export function decodeDeliveryDetailCursor(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw.trim(), "base64url").toString("utf8"),
    ) as DeliveryDetailCursorPayload;
    if (typeof parsed.id !== "string" || !parsed.id.trim()) return null;
    return parsed.id.trim();
  } catch {
    return null;
  }
}
