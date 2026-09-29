import { resolveMx } from "node:dns/promises";

const MX_TIMEOUT_MS = 4_000;

export async function resolveMxRecords(domain: string): Promise<Array<{ exchange: string }>> {
  const records = await Promise.race([
    resolveMx(domain),
    new Promise<never>((_, reject) => {
      const err = new Error("DNS timeout") as NodeJS.ErrnoException;
      err.code = "ETIMEOUT";
      setTimeout(() => reject(err), MX_TIMEOUT_MS);
    }),
  ]);
  return records.map((r) => ({ exchange: r.exchange }));
}
