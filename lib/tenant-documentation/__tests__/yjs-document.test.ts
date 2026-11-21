import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  diffYjsState,
  mergeYjsUpdate,
  TENANT_DOC_YJS_FRAGMENT,
} from "@/lib/tenant-documentation/yjs-document";

describe("tenant documentation yjs merge", () => {
  it("merges non-overlapping paragraph edits from two clients", () => {
    const base = new Y.Doc();
    const frag = base.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    const p1 = new Y.XmlElement("paragraph");
    const p2 = new Y.XmlElement("paragraph");
    const t1 = new Y.XmlText();
    const t2 = new Y.XmlText();
    t1.insert(0, "Editor A");
    t2.insert(0, "Editor B");
    p1.insert(0, [t1]);
    p2.insert(0, [t2]);
    frag.insert(0, [p1, p2]);
    const baseState = Y.encodeStateAsUpdate(base);

    const clientA = new Y.Doc();
    Y.applyUpdate(clientA, baseState);
    const fragA = clientA.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    const textA = (fragA.get(0) as Y.XmlElement).get(0) as Y.XmlText;
    textA.insert(textA.length, " + A");

    const clientB = new Y.Doc();
    Y.applyUpdate(clientB, baseState);
    const fragB = clientB.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    const textB = (fragB.get(1) as Y.XmlElement).get(0) as Y.XmlText;
    textB.insert(textB.length, " + B");

    let serverState = baseState;
    serverState = mergeYjsUpdate(serverState, Y.encodeStateAsUpdate(clientA));
    serverState = mergeYjsUpdate(serverState, Y.encodeStateAsUpdate(clientB));

    const verify = new Y.Doc();
    Y.applyUpdate(verify, serverState);
    const out = verify.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    expect(out.toString()).toContain("Editor A + A");
    expect(out.toString()).toContain("Editor B + B");
  });

  it("returns incremental diff for reconnecting client", () => {
    const doc = new Y.Doc();
    const text = doc.getText("t");
    text.insert(0, "hello");
    const full = Y.encodeStateAsUpdate(doc);

    const client = new Y.Doc();
    const diff = diffYjsState(full, Y.encodeStateVector(client));
    Y.applyUpdate(client, diff);
    expect(client.getText("t").toString()).toBe("hello");
  });
});