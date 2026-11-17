/**
 * FC Allschwil — PO-confirmed Vereinsleitung invitee emails only.
 * Do not infer display names, functions, or president privileges from these addresses.
 */

export const FCA_VL_INVITATION_CONFIRMED_EMAILS: readonly string[] = [
  "irem.uysal@fcallschwil.ch",
  "nicole.nussli@fcallschwil.ch",
  "andreas.gaedt@fcallschwil.ch",
  "rene.leupi@fcallschwil.ch",
] as const;

/** Already reconciled via parent package — skip in bulk invitation dry-run. */
export const FCA_VL_INVITATION_EXCLUDED_FROM_BULK_PREPARE: readonly string[] = [
  "patrick.scotton@fcallschwil.ch",
] as const;