export class SwissStructuredAddressError extends Error {
  readonly name = "SwissStructuredAddressError";
}

export type SwissStructuredAddress = {
  name: string;
  street: string;
  houseNumber?: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
};

function assertNonEmpty(value: string | null | undefined, field: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    throw new SwissStructuredAddressError(`${field} ist erforderlich.`);
  }
  return trimmed;
}

export function validateSwissStructuredAddress(
  input: SwissStructuredAddress,
  label: string,
): SwissStructuredAddress {
  const name = assertNonEmpty(input.name, `${label}: Name`);
  const street = assertNonEmpty(input.street, `${label}: Strasse`);
  const postalCode = assertNonEmpty(input.postalCode, `${label}: PLZ`);
  const city = assertNonEmpty(input.city, `${label}: Ort`);
  const countryCode = assertNonEmpty(input.countryCode, `${label}: Land`).toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new SwissStructuredAddressError(`${label}: Land muss ISO-3166 alpha-2 sein.`);
  }
  const houseNumber = input.houseNumber?.trim() || null;
  return { name, street, houseNumber, postalCode, city, countryCode };
}
