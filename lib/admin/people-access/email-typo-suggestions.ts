const KNOWN_PROVIDER_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "bluewin.ch",
  "sunrise.ch",
  "gmx.ch",
  "gmx.net",
] as const;

/** Common provider-domain typos → canonical domain (domain part only, lowercase). */
const DOMAIN_TYPO_MAP: Record<string, string> = {
  "gmail.c": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(
        dp[j]! + 1,
        dp[j - 1]! + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[n]!;
}

/**
 * Suggest a corrected full email when the domain looks like a known typo.
 * Returns null when no confident suggestion exists.
 */
export function suggestEmailTypoCorrection(normalizedEmail: string): string | null {
  const at = normalizedEmail.lastIndexOf("@");
  if (at <= 0) return null;
  const local = normalizedEmail.slice(0, at);
  const domain = normalizedEmail.slice(at + 1).toLowerCase();

  const mapped = DOMAIN_TYPO_MAP[domain];
  if (mapped) {
    return `${local}@${mapped}`;
  }

  let best: string | null = null;
  let bestDist = 3;
  for (const known of KNOWN_PROVIDER_DOMAINS) {
    const dist = levenshtein(domain, known);
    if (dist > 0 && dist < bestDist && domain.length >= 4) {
      bestDist = dist;
      best = known;
    }
  }
  if (best) {
    return `${local}@${best}`;
  }
  return null;
}
