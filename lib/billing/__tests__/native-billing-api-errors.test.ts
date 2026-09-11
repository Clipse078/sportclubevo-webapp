import { describe, expect, it } from "vitest";
import { BillingFieldCryptoError } from "../billing-field-crypto";
import { nativeBillingErrorResponse } from "../native-billing-api-errors";
import { NativeBillingValidationError } from "../native-billing-types";
import { SwissIbanError } from "../swiss-qr/swiss-iban";
import { SwissReferenceCompatError } from "../swiss-qr/swiss-reference-compat";

describe("nativeBillingErrorResponse", () => {
  it("maps Swiss IBAN validation to actionable German 400 responses", async () => {
    const response = nativeBillingErrorResponse(
      new SwissIbanError("IBAN-Prüfziffer ungültig."),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "IBAN-Prüfziffer ungültig." });
  });

  it("maps Swiss reference compatibility errors to 400", async () => {
    const response = nativeBillingErrorResponse(
      new SwissReferenceCompatError("QRR erfordert eine gültige QR-IBAN."),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "QRR erfordert eine gültige QR-IBAN.",
    });
  });

  it("maps domain validation errors to 400", async () => {
    const response = nativeBillingErrorResponse(
      new NativeBillingValidationError("QRR-Präfix muss numerisch sein."),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "QRR-Präfix muss numerisch sein.",
    });
  });

  it("keeps unexpected errors as safe internal 500", async () => {
    const response = nativeBillingErrorResponse(new Error("db blew up"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Interner Fehler." });
  });

  it("maps billing crypto misconfiguration without leaking secrets", async () => {
    const response = nativeBillingErrorResponse(
      new BillingFieldCryptoError("SCE_BILLING_ENCRYPTION_KEY is not configured"),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("Bankverbindung konnte nicht gelesen werden.");
    expect(JSON.stringify(body)).not.toMatch(/ENCRYPTION|KEY/i);
  });
});
