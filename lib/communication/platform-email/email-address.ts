import { z } from "zod";

const emailSchema = z.string().email();

export function normalizeEmailAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) return null;
  if (!emailSchema.safeParse(trimmed).success) return null;
  return trimmed;
}

export function isEligibleEmailAddress(value: string | null | undefined): boolean {
  return normalizeEmailAddress(value) !== null;
}
