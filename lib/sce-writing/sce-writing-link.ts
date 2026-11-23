/** Shared link validation + prompt for SCE TipTap writing surfaces. */

export function isAllowedEditorLinkHref(href: string): boolean {
  const trimmed = href.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("mailto:")
  );
}

export function promptAndApplyEditorLink(
  getPreviousHref: () => string | undefined,
  applyLink: (href: string) => void,
  clearLink: () => void,
): void {
  const previousUrl = getPreviousHref();
  const url = window.prompt("URL:", previousUrl ?? "https://");
  if (url === null) return;
  if (url === "") {
    clearLink();
    return;
  }
  if (!isAllowedEditorLinkHref(url)) return;
  applyLink(url.trim());
}