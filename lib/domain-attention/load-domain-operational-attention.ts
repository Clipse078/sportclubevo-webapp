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

  for (const source of sources) {
    const sourceKey = source.domainKey;
    try {
      const canRun = await source.canDiscover(ctx);
      if (!canRun) continue;

      const items = await source.evaluateAttention(ctx);
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
    } catch (error) {
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
    }
  }

  return {
    items: sortDomainOperationalAttentionItems(merged),
    failedSourceKeys,
  };
}
