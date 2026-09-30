import { describe, expect, it } from "vitest";
import {
  buildDomainOperationalAttentionId,
  parseDomainOperationalAttentionId,
} from "../source-identity";

describe("SCE-DOMAIN-CONSUMERS-01 — domain operational attention identity", () => {
  it("builds deterministic stable ids", () => {
    const id = buildDomainOperationalAttentionId({
      domainKey: "spielbetrieb",
      attentionKind: "participation-outstanding",
      contextEntityType: "event",
      contextEntityId: "evt-abc",
    });
    expect(id).toBe("domain-attn:spielbetrieb:participation-outstanding:event:evt-abc");
    expect(parseDomainOperationalAttentionId(id)).toEqual({
      domainKey: "spielbetrieb",
      attentionKind: "participation-outstanding",
      contextEntityType: "event",
      contextEntityId: "evt-abc",
    });
  });

  it("rejects empty segments", () => {
    expect(() =>
      buildDomainOperationalAttentionId({
        domainKey: "",
        attentionKind: "x",
        contextEntityType: "event",
        contextEntityId: "1",
      }),
    ).toThrow();
  });

  it("returns null for foreign id formats", () => {
    expect(parseDomainOperationalAttentionId("task:abc")).toBeNull();
    expect(parseDomainOperationalAttentionId("domain-attn:a:b:c")).toBeNull();
  });

  it("produces distinct ids when domain or context differs (tenant is scoped separately)", () => {
    const base = {
      attentionKind: "participation-outstanding",
      contextEntityType: "event",
      contextEntityId: "evt-1",
    };
    const spiel = buildDomainOperationalAttentionId({ domainKey: "spielbetrieb", ...base });
    const training = buildDomainOperationalAttentionId({ domainKey: "training", ...base });
    const otherEvent = buildDomainOperationalAttentionId({
      domainKey: "spielbetrieb",
      ...base,
      contextEntityId: "evt-2",
    });
    expect(spiel).not.toBe(training);
    expect(spiel).not.toBe(otherEvent);
    expect(buildDomainOperationalAttentionId({ domainKey: "spielbetrieb", ...base })).toBe(spiel);
  });

  it("does not embed tenantId — ids require tenant-scoped evaluation context", () => {
    const id = buildDomainOperationalAttentionId({
      domainKey: "spielbetrieb",
      attentionKind: "participation-outstanding",
      contextEntityType: "event",
      contextEntityId: "evt-1",
    });
    expect(id.includes("tenant")).toBe(false);
  });

  it("does not collide with PersonalAction participation ids", () => {
    const domainId = buildDomainOperationalAttentionAttentionLikeId();
    expect(domainId.startsWith("domain-attn:")).toBe(true);
    expect(domainId.startsWith("participation:")).toBe(false);
  });
});

function buildDomainOperationalAttentionAttentionLikeId(): string {
  return buildDomainOperationalAttentionId({
    domainKey: "training",
    attentionKind: "participation-outstanding",
    contextEntityType: "training-session",
    contextEntityId: "ts-1",
  });
}
