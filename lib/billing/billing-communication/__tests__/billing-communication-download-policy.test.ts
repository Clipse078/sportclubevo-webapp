import { describe, expect, it } from "vitest";
import { resolveBillingAttachmentContentDisposition } from "../billing-communication-download-policy";

describe("billing communication download policy", () => {
  it("forces attachment disposition for html content", () => {
    expect(
      resolveBillingAttachmentContentDisposition({
        contentType: "text/html",
        filename: "x.html",
      }),
    ).toBe('attachment; filename="x.html"');
  });

  it("uses attachment disposition for safe pdf downloads", () => {
    expect(
      resolveBillingAttachmentContentDisposition({
        contentType: "application/pdf",
        filename: "doc.pdf",
      }),
    ).toBe('attachment; filename="doc.pdf"');
  });
});
