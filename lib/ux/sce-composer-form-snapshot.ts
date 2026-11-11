/**
 * Stable JSON snapshot for composer dirty detection (SCE-UX-01B).
 */
export function sceSerializeFormSnapshot(value: unknown): string {
  return JSON.stringify(value);
}
