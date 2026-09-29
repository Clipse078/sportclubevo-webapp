const DEFAULT_SCE_SELECTOR_FETCH_TIMEOUT_MS = 25_000;

/**
 * Combines caller abort with a bounded wait so selector UI cannot skeleton forever.
 */
export async function fetchWithSceSelectorTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_SCE_SELECTOR_FETCH_TIMEOUT_MS;
  const { timeoutMs: _timeoutMs, signal: callerSignal, ...rest } = init;
  void _timeoutMs;
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs);

  const onCallerAbort = () => timeoutController.abort();
  if (callerSignal) {
    if (callerSignal.aborted) {
      window.clearTimeout(timeoutId);
      throw new DOMException("Aborted", "AbortError");
    }
    callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }

  try {
    return await fetch(input, {
      ...rest,
      credentials: rest.credentials ?? "same-origin",
      signal: timeoutController.signal,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError" &&
      !callerSignal?.aborted &&
      timeoutController.signal.aborted
    ) {
      throw new Error("SCE_SELECTOR_FETCH_TIMEOUT");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    if (callerSignal) {
      callerSignal.removeEventListener("abort", onCallerAbort);
    }
  }
}

export { DEFAULT_SCE_SELECTOR_FETCH_TIMEOUT_MS };
