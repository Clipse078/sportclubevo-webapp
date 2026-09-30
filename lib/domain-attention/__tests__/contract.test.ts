import { describe, expect, it } from "vitest";
import type {
  DeferredDomainAudienceReference,
  DomainOperationalAttentionAction,
  DomainOperationalAttentionItem,
} from "../types";

describe("SCE-DOMAIN-CONSUMERS-01 — domain operational attention contract", () => {
  it("DeferredDomainAudienceReference carries selector keys only (no resolved recipients)", () => {
    const ref: DeferredDomainAudienceReference = {
      sourceKey: "spielbetrieb.teilnahme",
      candidateId: "not-responded/evt-1",
      displayLabel: "Ohne Rückmeldung",
    };
    const keys = Object.keys(ref).sort();
    expect(keys).toEqual(["candidateId", "displayLabel", "sourceKey"]);
    expect(JSON.parse(JSON.stringify(ref))).toEqual(ref);
  });

  it("action requiredPermissions is a permission-key list (not client send authority)", () => {
    const action: DomainOperationalAttentionAction = {
      actionKey: "send-reminder",
      label: "Erinnerung senden",
      executionKind: "COMMUNICATION_SEND",
      requiredPermissions: ["communication.team.send"],
      domainAudience: {
        sourceKey: "spielbetrieb.teilnahme",
        candidateId: "not-responded/evt-1",
      },
    };
    expect(Array.isArray(action.requiredPermissions)).toBe(true);
    expect(action.requiredPermissions.every((p) => typeof p === "string")).toBe(true);
    expect(JSON.parse(JSON.stringify(action))).toMatchObject({
      actionKey: "send-reminder",
      executionKind: "COMMUNICATION_SEND",
    });
  });

  it("attention item is JSON-friendly and scopes tenant on the item, not in stable id parts", () => {
    const item: DomainOperationalAttentionItem = {
      id: "domain-attn:spielbetrieb:participation-outstanding:event:evt-1",
      tenantId: "tenant-a",
      domainKey: "spielbetrieb",
      attentionKind: "participation-outstanding",
      contextEntityType: "event",
      contextEntityId: "evt-1",
      title: "2 Rückmeldungen ausstehend",
      summary: null,
      severity: "warning",
      count: 2,
      dueAt: null,
      deepLink: "/teams/1/events/evt-1",
      actions: [],
    };
    const roundTrip = JSON.parse(JSON.stringify(item)) as DomainOperationalAttentionItem;
    expect(roundTrip.tenantId).toBe("tenant-a");
    expect(roundTrip.id).not.toContain("tenant-a");
  });
});
