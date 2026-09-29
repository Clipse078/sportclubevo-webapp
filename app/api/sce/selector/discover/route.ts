import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { discoverSceSelectorItems } from "@/lib/sce/list-selector/discover-selector-items";
import { parseSelectorSourceTypesParam } from "@/lib/sce/list-selector/communication-bridge";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import { SCE_SELECTOR_SOURCE_TYPES, type SceSelectorSourceType } from "@/lib/sce/list-selector/types";

export const dynamic = "force-dynamic";

function parseCategory(value: string | null): SceSelectorCategoryId {
  if (
    value === "person" ||
    value === "team" ||
    value === "org_unit" ||
    value === "role" ||
    value === "target_group" ||
    value === "external_contact"
  ) {
    return value;
  }
  return "all";
}

function parseEnabledTypes(raw: string | null): SceSelectorSourceType[] {
  const parsed = parseSelectorSourceTypesParam(raw);
  if (parsed?.length) return parsed;
  return [...SCE_SELECTOR_SOURCE_TYPES];
}

/**
 * Generic SCE selector discover endpoint (tenant-scoped; authorization is caller's duty).
 * Communication uses `/api/communication/audience/discover` with stricter capability checks.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const category = parseCategory(url.searchParams.get("category"));
  const enabledTypes = parseEnabledTypes(url.searchParams.get("sources"));

  if (enabledTypes.length === 0) {
    return NextResponse.json({ groups: [], noAccess: true });
  }

  try {
    const groups = await discoverSceSelectorItems({
      tenantId: tenant.id,
      actorUserId: userId,
      enabledTypes,
      category,
      query,
      communicationContext: "ORGANISATION",
    });
    return NextResponse.json({ groups, noAccess: false });
  } catch {
    return NextResponse.json(
      { error: "Auswahl konnte nicht geladen werden.", groups: [] },
      { status: 500 },
    );
  }
}
