/**
 * COMM-14 — bounded wait for outbound provider/network I/O.
 */

export const OUTBOUND_EMAIL_TRANSPORT_TIMEOUT_MS = 25_000;

export class OutboundEmailOperationTimeoutError extends Error {
  constructor(label: string) {
    super(`Outbound email operation timed out: ${label}`);
    this.name = "OutboundEmailOperationTimeoutError";
  }
}

export async function withOutboundEmailOperationTimeout<T>(
  label: string,
  promise: Promise<T>,
  timeoutMs: number = OUTBOUND_EMAIL_TRANSPORT_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new OutboundEmailOperationTimeoutError(label));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
