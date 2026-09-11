/** Recursive Modulo-10 check digit (Swiss QR / ESR), carry table per SIX spec. */
const MOD10_CARRY_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];

export class SwissModulo10Error extends Error {
  readonly name = "SwissModulo10Error";
}

/** Computes the Modulo-10 check digit for a numeric reference body (without check digit). */
export function swissModulo10CheckDigit(numericBody: string): string {
  if (!numericBody) {
    throw new SwissModulo10Error("Leerer Referenzblock.");
  }
  if (!/^\d+$/.test(numericBody)) {
    throw new SwissModulo10Error("Referenzblock muss numerisch sein.");
  }

  let carry = 0;
  for (const char of numericBody) {
    const digit = Number(char);
    carry = MOD10_CARRY_TABLE[(carry + digit) % 10];
  }
  const check = (10 - carry) % 10;
  return String(check);
}

/** Appends Modulo-10 check digit to a 26-digit QRR payload body. */
export function appendModulo10CheckDigit(numericBody26: string): string {
  if (numericBody26.length !== 26) {
    throw new SwissModulo10Error("QRR-Body muss genau 26 Stellen haben.");
  }
  const digit = swissModulo10CheckDigit(numericBody26);
  return `${numericBody26}${digit}`;
}
