import {
  resolveInfoboardDisplayTheme,
  type InfoboardDisplayTheme,
} from "@/lib/publishing/infoboard/display-theme";

/**
 * Parses optional Preview URL `displayTheme` (preview/UAT only — never persisted).
 * When absent or invalid, resolves from the board/tenant fallback raw value.
 */
export function parseInfoboardPreviewDisplayTheme(
  queryValue: string | undefined,
  fallbackRaw: string | null | undefined,
): InfoboardDisplayTheme {
  if (queryValue != null && queryValue.trim() !== "") {
    return resolveInfoboardDisplayTheme(queryValue);
  }
  return resolveInfoboardDisplayTheme(fallbackRaw);
}
