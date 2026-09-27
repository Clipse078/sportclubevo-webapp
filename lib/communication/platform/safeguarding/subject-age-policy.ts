/**
 * SCE-COMM-18 — tenant-configurable minor determination (reference-date aware).
 */

export function personAgeInWholeYears(
  dateOfBirth: Date,
  referenceDate: Date,
): number {
  let age = referenceDate.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = referenceDate.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && referenceDate.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function isPersonMinorUnderTenantPolicy(input: {
  dateOfBirth: Date | null;
  minorAgeThresholdYears: number;
  referenceDate: Date;
}): boolean {
  if (!input.dateOfBirth) return false;
  const age = personAgeInWholeYears(input.dateOfBirth, input.referenceDate);
  return age < input.minorAgeThresholdYears;
}
