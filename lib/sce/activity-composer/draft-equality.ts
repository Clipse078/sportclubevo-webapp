/** Shallow structural equality for composer dirty detection (foundation). */
export function sceActivityDraftsEqual<TDraft>(a: TDraft, b: TDraft): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
