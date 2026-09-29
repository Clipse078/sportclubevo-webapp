import type { SceSelectorItem, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTargetGroupAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "@/lib/requirements/requirement-audience-resolvers";

const STRUCTURAL_TYPES = new Set<SceSelectorSourceType>([
  "TEAM",
  "ORG_UNIT",
  "ROLE",
  "TARGET_GROUP",
]);

function personCountLabel(count: number): string {
  if (count === 1) return "1 Person";
  return `${count} Personen`;
}

async function resolvePersonCountForItem(
  tenantId: string,
  item: SceSelectorItem,
): Promise<number | null> {
  try {
    switch (item.type) {
      case "TEAM":
        return (await resolveTeamAudiencePersonIds(tenantId, [item.id])).length;
      case "ORG_UNIT":
        return (await resolveOrgUnitAudiencePersonIds(tenantId, [item.id])).length;
      case "ROLE":
        return (await resolveRoleAudiencePersonIds(tenantId, [item.id])).length;
      case "TARGET_GROUP":
        return (await resolveTargetGroupAudiencePersonIds(tenantId, [item.id])).length;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export async function enrichRequirementAudienceStructuralItems(
  tenantId: string,
  items: readonly SceSelectorItem[],
): Promise<SceSelectorItem[]> {
  const structural = items.filter((item) => STRUCTURAL_TYPES.has(item.type));
  if (structural.length === 0) return [...items];

  const counts = await Promise.all(
    structural.map(async (item) => ({
      id: item.id,
      type: item.type,
      count: await resolvePersonCountForItem(tenantId, item),
    })),
  );
  const countByKey = new Map(counts.map((row) => [`${row.type}:${row.id}`, row.count]));

  return items.map((item) => {
    if (!STRUCTURAL_TYPES.has(item.type)) return item;
    const count = countByKey.get(`${item.type}:${item.id}`);
    if (count == null) return item;
    return {
      ...item,
      description: personCountLabel(count),
      metadata: {
        ...item.metadata,
        expansionPersonCount: count,
        expansionSource: true,
      },
    };
  });
}
