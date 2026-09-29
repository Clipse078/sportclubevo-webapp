import { NextResponse } from "next/server";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { discoverSceSelectorItems } from "@/lib/sce/list-selector/discover-selector-items";
import { parseSelectorSourceTypesParam } from "@/lib/sce/list-selector/communication-bridge";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import { auth } from "@/auth";

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

/**
 * Generic SCE selector discover — gated to communication-capable users only.
 * Communication product flows should prefer `/api/communication/audience/discover`
 * (capability + sender-scope aware).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const access = await requireApiAnyPermission(
    [
      PERMISSIONS.COMMUNICATION_CLUB_SEND,
      PERMISSIONS.COMMUNICATION_CLUB_VIEW,
      PERMISSIONS.COMMUNICATION_TEAM_SEND,
    ],
    tenant.id,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const category = parseCategory(url.searchParams.get("category"));
  const enabledTypes = parseSelectorSourceTypesParam(url.searchParams.get("sources"));

  if (!enabledTypes?.length) {
    return NextResponse.json(
      { error: "Ungültige oder fehlende sources.", groups: [] },
      { status: 400 },
    );
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
