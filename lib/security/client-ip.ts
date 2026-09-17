import type { NextRequest } from "next/server";

/** Stable fallback when no trusted proxy identity is available. */
export const UNKNOWN_CLIENT_IP = "unknown";

/**
 * Extract the client IP from a request behind Vercel / a trusted reverse proxy.
 *
 * Forwarded headers are trusted **only** when requests enter through the
 * configured hosting edge (e.g. Vercel). This helper does not cryptographically
 * validate headers — it applies the platform's documented first-hop model.
 *
 * Resolution order:
 *   1. First comma-separated entry of `x-forwarded-for`
 *   2. `x-real-ip`
 *   3. {@link UNKNOWN_CLIENT_IP}
 *
 * Server-only — do not import from client components.
 */
export function getClientIp(request: Pick<NextRequest, "headers">): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return UNKNOWN_CLIENT_IP;
}
