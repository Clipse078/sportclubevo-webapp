/** FIN-06D — clipboard copy for publication share URLs (client-safe). */

export async function copyFinancePublicationShareAbsoluteUrl(
  absoluteUrl: string,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(absoluteUrl);
    return true;
  } catch {
    return false;
  }
}
