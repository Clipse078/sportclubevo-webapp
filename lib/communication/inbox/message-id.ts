export function normalizeInternetMessageId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutBrackets = trimmed.replace(/^<|>$/g, "").trim();
  return withoutBrackets ? `<${withoutBrackets}>` : null;
}

export function normalizeEmailAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
