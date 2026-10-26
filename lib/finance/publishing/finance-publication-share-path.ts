/**
 * FIN-06D — external publication share URL (token is the authority).
 */

export const FINANCE_PUBLICATION_SHARE_ROUTE_PREFIX =
  "/share/finance/publication" as const;

export function financePublicationSharePath(rawToken: string): string {
  const token = rawToken.trim();
  return `${FINANCE_PUBLICATION_SHARE_ROUTE_PREFIX}/${encodeURIComponent(token)}`;
}

export function financePublicationSharePdfApiPath(rawToken: string): string {
  const token = rawToken.trim();
  return `/api/share/finance/publication/${encodeURIComponent(token)}/pdf`;
}

export function buildFinancePublicationShareAbsoluteUrl(input: {
  origin: string;
  rawToken: string;
}): string {
  const origin = input.origin.replace(/\/+$/, "");
  return `${origin}${financePublicationSharePath(input.rawToken)}`;
}
