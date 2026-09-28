import { describe, expect, it } from "vitest";
import {
  sanitizePersonalSignatureContent,
  signatureContentToPlainText,
  signatureContentToEmailHtml,
  plainTextToSignatureContent,
} from "@/lib/communication/personal-signature/signature-content";
import { isAllowedSignatureLinkHref } from "@/lib/communication/personal-signature/signature-link-validation";
import { buildSignatureCid, renderEmailBodyHtmlFromFreeze } from "@/lib/communication/personal-signature/signature-email-delivery";
import { buildPersonalSignatureFreezeSnapshot } from "@/lib/communication/personal-signature/personal-signature-freeze";
import { PersonalSignatureContentError } from "@/lib/communication/personal-signature/signature-content";
import { emptyPersonalSignatureContent } from "@/lib/communication/personal-signature/signature-content";

describe("SCE-COMM-EVO-07 rich personal signatures", () => {
  it("migrates legacy plain text to identical structured output", () => {
    const plain = "Freundliche Grüsse\nMax Mustermann";
    const doc = plainTextToSignatureContent(plain);
    expect(signatureContentToPlainText(doc)).toBe(plain);
  });

  it("strips script-like link schemes", () => {
    expect(isAllowedSignatureLinkHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedSignatureLinkHref("https://fcallschwil.ch")).toBe(true);
    expect(isAllowedSignatureLinkHref("mailto:info@fc.ch")).toBe(true);
  });

  it("renders email HTML with CID logo reference", () => {
    const doc = sanitizePersonalSignatureContent({
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "FC Allschwil" }] },
        {
          type: "signatureImage",
          attrs: { attachmentId: "att1", altText: "FC Allschwil", cidKey: "att1" },
        },
      ],
    });
    const html = signatureContentToEmailHtml(doc, {
      cidForAttachment: (id) => buildSignatureCid(id, id),
    });
    expect(html).toContain('src="cid:sce-personal-signature-att1@sportclubevo.local"');
    expect(html).not.toContain("att1.storage");
  });

  it("plain text fallback omits images", () => {
    const doc = sanitizePersonalSignatureContent({
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Line" }] },
        {
          type: "signatureImage",
          attrs: { attachmentId: "att1", altText: "Logo", cidKey: "att1" },
        },
      ],
    });
    expect(signatureContentToPlainText(doc)).toBe("Line");
  });

  it("rejects unsupported nodes / unsafe links", () => {
    expect(() =>
      sanitizePersonalSignatureContent({
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [{ type: "link", attrs: { href: "javascript:evil" } }],
              },
            ],
          },
        ],
      }),
    ).toThrow(PersonalSignatureContentError);
  });

  it("builds historical freeze snapshot", () => {
    const content = emptyPersonalSignatureContent();
    content.content = [
      { type: "paragraph", content: [{ type: "text", text: "Footer" }] },
    ];
    const freeze = buildPersonalSignatureFreezeSnapshot({
      messageBodyText: "Hello",
      contentJson: content,
      legacyPlain: null,
      assets: [],
      contentVersion: 2,
    });
    expect(freeze?.messageBodyText).toBe("Hello");
    expect(freeze?.contentVersion).toBe(2);
    const html = renderEmailBodyHtmlFromFreeze({
      messageBodyText: "Hello",
      signaturePlainText: "Footer",
      freeze,
    });
    expect(html).toContain("Footer");
  });
});

describe("SCE-COMM-EVO-07 signature image validation", () => {
  it("rejects oversize signature images", async () => {
    const { validatePersonalSignatureImage } = await import(
      "@/lib/communication/personal-signature/signature-image-validation"
    );
    const big = new Uint8Array(600 * 1024);
    await expect(
      validatePersonalSignatureImage({
        filename: "logo.png",
        declaredContentType: "image/png",
        buffer: big,
      }),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });
});
