import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DomainOperationalAttentionEvaluationContext,
  DomainOperationalAttentionItem,
  DomainOperationalAttentionSource,
} from "../types";
import { buildDomainOperationalAttentionId } from "../source-identity";
import {
  _clearDomainOperationalAttentionRegistryForTests,
  listRegisteredDomainOperationalAttentionSources,
  registerDomainOperationalAttentionSource,
} from "../operational-attention-registry";
import { buildOperationalAttentionSourceRegistryKey } from "../operational-attention-source-id";
import { ensureProductionOperationalAttentionSourcesRegistered } from "../register-production-operational-attention-sources";
import { loadDomainOperationalAttention } from "../load-domain-operational-attention";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function makeItem(overrides: Partial<DomainOperationalAttentionItem> & { domainKey: string; entityId: string }): DomainOperationalAttentionItem {
  const attentionKind = "participation-outstanding";
  return {
    id: buildDomainOperationalAttentionId({
      domainKey: overrides.domainKey,
      attentionKind,
      contextEntityType: "event",
      contextEntityId: overrides.entityId,
    }),
    tenantId: overrides.tenantId ?? "tenant-a",
    domainKey: overrides.domainKey,
    attentionKind,
    contextEntityType: "event",
    contextEntityId: overrides.entityId,
    title: overrides.title ?? overrides.domainKey,
    summary: overrides.summary ?? null,
    severity: overrides.severity ?? "info",
    count: overrides.count ?? 1,
    dueAt: overrides.dueAt ?? null,
    deepLink: overrides.deepLink ?? "/",
    actions: overrides.actions ?? [],
  };
}

function mockSource(input: {
  domainKey: string;
  attentionKind?: string;
  canDiscover?: boolean;
  items?: DomainOperationalAttentionItem[];
  evaluateError?: Error;
}): DomainOperationalAttentionSource {
  const attentionKind = input.attentionKind ?? "participation-outstanding";
  return {
    domainKey: input.domainKey,
    requiredPermissions: [],
    async canDiscover() {
      return input.canDiscover ?? true;
    },
    async evaluateAttention() {
      if (input.evaluateError) throw input.evaluateError;
      return input.items ?? [];
    },
  };
}

describe("SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — registry", () => {
  beforeEach(() => {
    _clearDomainOperationalAttentionRegistryForTests();
  });

  it("registers production sources with deterministic ordering", () => {
    ensureProductionOperationalAttentionSourcesRegistered();
    const keys = listRegisteredDomainOperationalAttentionSources().map((s) => s.domainKey);
    expect(keys).toEqual(["events", "spielbetrieb", "training"]);
  });

  it("repeated ensureProductionOperationalAttentionSourcesRegistered is idempotent", () => {
    ensureProductionOperationalAttentionSourcesRegistered();
    ensureProductionOperationalAttentionSourcesRegistered();
    expect(listRegisteredDomainOperationalAttentionSources()).toHaveLength(3);
  });

  it("duplicate registration fails loudly", () => {
    const source = mockSource({ domainKey: "demo" });
    registerDomainOperationalAttentionSource(source, "participation-outstanding");
    expect(() =>
      registerDomainOperationalAttentionSource(source, "participation-outstanding"),
    ).toThrow(/already registered/);
  });

  it("source identity is domainKey:attentionKind", () => {
    expect(
      buildOperationalAttentionSourceRegistryKey({
        domainKey: "training",
        attentionKind: "participation-outstanding",
      }),
    ).toBe("training:participation-outstanding");
  });
});

describe("SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — aggregator", () => {
  beforeEach(() => {
    _clearDomainOperationalAttentionRegistryForTests();
    vi.restoreAllMocks();
  });

  it("SPIELBETRIEB — outstanding, zero, unauthorized", async () => {
    registerDomainOperationalAttentionSource(
      mockSource({
        domainKey: "spielbetrieb",
        canDiscover: true,
        items: [makeItem({ domainKey: "spielbetrieb", entityId: "e1", count: 2 })],
      }),
      "participation-outstanding",
    );

    const withItems = await loadDomainOperationalAttention({
      tenantId: "tenant-a",
      actorUserId: "trainer",
      permissionKeys: [PERMISSIONS.COMMUNICATION_TEAM_VIEW],
    });
    expect(withItems.items).toHaveLength(1);
    expect(withItems.items[0]?.count).toBe(2);

    _clearDomainOperationalAttentionRegistryForTests();
    registerDomainOperationalAttentionSource(
      mockSource({ domainKey: "spielbetrieb", items: [] }),
      "participation-outstanding",
    );
    expect(
      (await loadDomainOperationalAttention({
        tenantId: "tenant-a",
        actorUserId: "trainer",
        permissionKeys: [],
      })).items,
    ).toHaveLength(0);

    _clearDomainOperationalAttentionRegistryForTests();
    registerDomainOperationalAttentionSource(
      mockSource({ domainKey: "spielbetrieb", canDiscover: false, items: [makeItem({ domainKey: "spielbetrieb", entityId: "e1" })] }),
      "participation-outstanding",
    );
    expect(
      (await loadDomainOperationalAttention({
        tenantId: "tenant-a",
        actorUserId: "trainer",
        permissionKeys: [],
      })).items,
    ).toHaveLength(0);
  });

  it("mixed user — three domains, training resolves, permission loss", async () => {
    let trainingCount = 4;
    _clearDomainOperationalAttentionRegistryForTests();
    registerDomainOperationalAttentionSource(
      mockSource({
        domainKey: "spielbetrieb",
        items: [makeItem({ domainKey: "spielbetrieb", entityId: "m1", count: 2 })],
      }),
      "participation-outstanding",
    );
    const trainingSource: DomainOperationalAttentionSource = {
      domainKey: "training",
      requiredPermissions: [],
      async canDiscover(ctx) {
        return ctx.permissionKeys.has(PERMISSIONS.COMMUNICATION_TEAM_VIEW);
      },
      async evaluateAttention() {
        if (trainingCount <= 0) return [];
        return [makeItem({ domainKey: "training", entityId: "t1", count: trainingCount })];
      },
    };
    registerDomainOperationalAttentionSource(trainingSource, "participation-outstanding");
    const eventsSource: DomainOperationalAttentionSource = {
      domainKey: "events",
      requiredPermissions: [],
      async canDiscover(ctx) {
        return ctx.permissionKeys.has(PERMISSIONS.EVENTS_VIEW);
      },
      async evaluateAttention() {
        return [makeItem({ domainKey: "events", entityId: "ev1", count: 6 })];
      },
    };
    registerDomainOperationalAttentionSource(eventsSource, "participation-outstanding");

    const permissionKeys = new Set([
      PERMISSIONS.COMMUNICATION_TEAM_VIEW,
      PERMISSIONS.EVENTS_VIEW,
    ]);

    const three = await loadDomainOperationalAttention({
      tenantId: "tenant-a",
      actorUserId: "multi-role",
      permissionKeys,
    });
    expect(three.items).toHaveLength(3);

    trainingCount = 0;
    const two = await loadDomainOperationalAttention({
      tenantId: "tenant-a",
      actorUserId: "multi-role",
      permissionKeys,
    });
    expect(two.items).toHaveLength(2);
    expect(two.items.some((i) => i.domainKey === "training")).toBe(false);

    permissionKeys.delete(PERMISSIONS.EVENTS_VIEW);
    const one = await loadDomainOperationalAttention({
      tenantId: "tenant-a",
      actorUserId: "multi-role",
      permissionKeys,
    });
    expect(one.items).toHaveLength(1);
    expect(one.items[0]?.domainKey).toBe("spielbetrieb");
  });

  it("failure isolation — one source throws, others still render", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    registerDomainOperationalAttentionSource(
      mockSource({
        domainKey: "spielbetrieb",
        evaluateError: new Error("db down"),
      }),
      "participation-outstanding",
    );
    registerDomainOperationalAttentionSource(
      mockSource({
        domainKey: "training",
        items: [makeItem({ domainKey: "training", entityId: "t1" })],
      }),
      "participation-outstanding",
    );

    const result = await loadDomainOperationalAttention({
      tenantId: "tenant-a",
      actorUserId: "u1",
      permissionKeys: [],
    });
    expect(result.items).toHaveLength(1);
    expect(result.failedSourceKeys).toEqual(["spielbetrieb"]);
    consoleSpy.mockRestore();
  });

  it("duplicate stable id fails loudly", async () => {
    const duplicate = makeItem({ domainKey: "spielbetrieb", entityId: "same" });
    registerDomainOperationalAttentionSource(
      mockSource({ domainKey: "spielbetrieb", items: [duplicate, duplicate] }),
      "participation-outstanding",
    );

    await expect(
      loadDomainOperationalAttention({
        tenantId: "tenant-a",
        actorUserId: "u1",
        permissionKeys: [],
      }),
    ).rejects.toThrow(/Duplicate operational attention id/);
  });

  it("tenant isolation — rejects cross-tenant items", async () => {
    registerDomainOperationalAttentionSource(
      mockSource({
        domainKey: "spielbetrieb",
        items: [makeItem({ domainKey: "spielbetrieb", entityId: "e1", tenantId: "tenant-b" })],
      }),
      "participation-outstanding",
    );

    await expect(
      loadDomainOperationalAttention({
        tenantId: "tenant-a",
        actorUserId: "u1",
        permissionKeys: [],
      }),
    ).rejects.toThrow(/cross-tenant/);
  });
});

describe("SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — personal + operational mix", () => {
  it("PersonalAction ids do not collide with domain-attn ids", () => {
    const personalId = "participation:person:TRAINING:ts-1";
    const domainId = buildDomainOperationalAttentionId({
      domainKey: "training",
      attentionKind: "participation-outstanding",
      contextEntityType: "training-session",
      contextEntityId: "ts-1",
    });
    expect(personalId).not.toBe(domainId);
  });
});
