/**
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — canonical aggregator (live read model, no persistence).
 */

import type {
  DomainOperationalAttentionEvaluationContext,
  DomainOperationalAttentionItem,
} from "./types";
import { ensureProductionOperationalAttentionSourcesRegistered } from "./register-production-operational-attention-sources";
import { listRegisteredDomainOperationalAttentionSources } from "./operational-attention-registry";
import { sortDomainOperationalAttentionItems } from "./sort-operational-attention-items";
import {
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  logSceHotfixLogin01StepFailed,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

export type LoadDomainOperationalAttentionArgs = {
  tenantId: string;
  actorUserId: string;
  permissionKeys: ReadonlySet<string> | readonly string[];
  now?: Date;
};

export type LoadDomainOperationalAttentionResult = {
  items: DomainOperationalAttentionItem[];
  /** Sources that threw during evaluation (observable failure isolation). */
  failedSourceKeys: string[];
};

function permissionKeySet(keys: ReadonlySet<string> | readonly string[]): ReadonlySet<string> {
  return keys instanceof Set ? keys : new Set(keys);
}

export async function loadDomainOperationalAttention(
  args: LoadDomainOperationalAttentionArgs,
): Promise<LoadDomainOperationalAttentionResult> {
  ensureProductionOperationalAttentionSourcesRegistered();

  const ctx: DomainOperationalAttentionEvaluationContext = {
    tenantId: args.tenantId,
    userId: args.actorUserId,
    permissionKeys: permissionKeySet(args.permissionKeys),
    now: args.now ?? new Date(),
  };

  const sources = listRegisteredDomainOperationalAttentionSources();
  const merged: DomainOperationalAttentionItem[] = [];
  const seenIds = new Set<string>();
  const failedSourceKeys: string[] = [];

  if (sceHotfixLogin01TraceEnabled()) {
    logSceHotfixLogin01Step("operational-attention");
  }

  const sourceTraceKey: Record<string, string> = {
    spielbetrieb: "spielbetrieb",
    training: "training",
    events: "events",
  };

  const evaluations = await Promise.all(
    sources.map(async (source) => {
      const sourceKey = source.domainKey;
      const traceStep = sourceTraceKey[sourceKey] ?? sourceKey;
      if (sceHotfixLogin01TraceEnabled()) {
        logSceHotfixLogin01Step(traceStep);
      }
      try {
        const canRun = await source.canDiscover(ctx);
        if (!canRun) {
          if (sceHotfixLogin01TraceEnabled()) {
            logSceHotfixLogin01StepDone(traceStep);
          }
          return { sourceKey, items: [] as DomainOperationalAttentionItem[] };
        }

        const items = await source.evaluateAttention(ctx);
        if (sceHotfixLogin01TraceEnabled()) {
          logSceHotfixLogin01StepDone(traceStep);
        }
        return { sourceKey, items };
      } catch (error) {
        if (sceHotfixLogin01TraceEnabled()) {
          logSceHotfixLogin01StepFailed(traceStep, error);
        }
        if (error instanceof Error && error.message.includes("Duplicate operational attention id")) {
          throw error;
        }
        if (error instanceof Error && error.message.includes("cross-tenant item")) {
          throw error;
        }
        failedSourceKeys.push(sourceKey);
        console.error(
          `[domain-operational-attention] source "${sourceKey}" evaluation failed`,
          error,
        );
        return { sourceKey, items: [] as DomainOperationalAttentionItem[] };
      }
    }),
  );

  for (const { sourceKey, items } of evaluations) {
    for (const item of items) {
      if (item.tenantId !== ctx.tenantId) {
        throw new Error(
          `Operational attention source "${sourceKey}" returned cross-tenant item (${item.id}).`,
        );
      }
      if (seenIds.has(item.id)) {
        throw new Error(
          `Duplicate operational attention id "${item.id}" from source "${sourceKey}".`,
        );
      }
      seenIds.add(item.id);
      merged.push(item);
    }
  }

  if (sceHotfixLogin01TraceEnabled()) {
    logSceHotfixLogin01StepDone("operational-attention");
  }

  return {
    items: sortDomainOperationalAttentionItems(merged),
    failedSourceKeys,
  };
}
