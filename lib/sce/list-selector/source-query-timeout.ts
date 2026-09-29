const DEFAULT_SOURCE_QUERY_TIMEOUT_MS = 12_000;

export async function withSceSelectorSourceTimeout<T>(
  label: string,
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_SOURCE_QUERY_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`SCE_SELECTOR_SOURCE_TIMEOUT:${label}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export { DEFAULT_SOURCE_QUERY_TIMEOUT_MS };
