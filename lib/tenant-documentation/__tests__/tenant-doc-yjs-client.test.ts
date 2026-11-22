/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import {
  Y,
  TENANT_DOC_YJS_FRAGMENT,
  applyYjsUpdateToDoc,
} from "@/lib/tenant-documentation/tenant-doc-yjs-client";

describe("tenant-doc-yjs-client", () => {
  it("shares one Yjs module for Doc construction", () => {
    const doc = new Y.Doc();
    const frag = doc.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    expect(frag).toBeTruthy();
    applyYjsUpdateToDoc(doc, "");
    expect(doc).toBeInstanceOf(Y.Doc);
  });
});