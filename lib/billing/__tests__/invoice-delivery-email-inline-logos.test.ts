import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { SPORTCLUBEVO_FOOTER_LOGO_ASSET_SHA256 } from "@/lib/billing/invoice-pdf/constants";

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
import {
  buildInvoiceDeliveryEmailAttachments,
  getInvoiceDeliveryEmailInlineLogoAttachments,
} from "@/lib/billing/invoice-delivery/invoice-delivery-email-inline-logos";

describe("invoice delivery email inline logos", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("loads SportClubEvo and Tulip logos independently of process.cwd()", () => {
    process.chdir("/tmp");
    const attachments = getInvoiceDeliveryEmailInlineLogoAttachments();
    expect(attachments).toHaveLength(2);
    expect(attachments[0].contentDisposition).toBe("inline");
    expect(attachments[1].contentDisposition).toBe("inline");
    expect(sha256Hex(new Uint8Array(attachments[0].content))).toBe(
      SPORTCLUBEVO_FOOTER_LOGO_ASSET_SHA256,
    );
    expect(attachments[1].content.byteLength).toBeGreaterThan(10_000);
  });

  it("builds PDF + inline logo attachments from a non-repo cwd", () => {
    process.chdir("/tmp");
    const attachments = buildInvoiceDeliveryEmailAttachments({
      filename: "SportClubEvo-Rechnung-test.pdf",
      content: Buffer.from("%PDF"),
    });
    expect(attachments).toHaveLength(3);
    expect(attachments[2].contentType).toBe("application/pdf");
    expect(attachments[2].contentDisposition).toBe("attachment");
  });
});
