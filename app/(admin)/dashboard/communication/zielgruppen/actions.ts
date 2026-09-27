"use server";

import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/zielgruppen/route-access";
import {
  searchRequirementAudienceOrgUnits,
  searchRequirementAudienceRoles,
  searchRequirementAudienceTeams,
} from "@/lib/requirements/audience-selector-search";
import { searchRequirementAudiencePersons } from "@/lib/requirements/person-search";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { previewZielgruppeRecipients } from "@/lib/communication/zielgruppen/preview-service";

type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function requireZielgruppenView() {
  await requireAnyPermission(ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) throw new Error("Tenant nicht gefunden.");
  return tenant;
}

export async function searchZielgruppeOrgUnitsAction(query: string): Promise<
  ActionResult<Array<{ id: string; label: string }>>
> {
  try {
    const tenant = await requireZielgruppenView();
    const rows = await searchRequirementAudienceOrgUnits(tenant.id, query);
    return { ok: true, data: rows.map((r) => ({ id: r.orgUnitId, label: r.label })) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Suche fehlgeschlagen." };
  }
}

export async function searchZielgruppeTeamsAction(query: string): Promise<
  ActionResult<Array<{ id: string; label: string }>>
> {
  try {
    const tenant = await requireZielgruppenView();
    const rows = await searchRequirementAudienceTeams(tenant.id, query);
    return { ok: true, data: rows.map((r) => ({ id: r.teamId, label: r.label })) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Suche fehlgeschlagen." };
  }
}

export async function searchZielgruppeRolesAction(query: string): Promise<
  ActionResult<Array<{ id: string; label: string }>>
> {
  try {
    const tenant = await requireZielgruppenView();
    const rows = await searchRequirementAudienceRoles(tenant.id, query);
    return { ok: true, data: rows.map((r) => ({ id: r.roleId, label: r.label })) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Suche fehlgeschlagen." };
  }
}

export async function previewZielgruppeRecipientsAction(input: {
  definition: ZielgruppeEditorDefinition;
  page?: number;
}): Promise<
  ActionResult<Awaited<ReturnType<typeof previewZielgruppeRecipients>>>
> {
  try {
    const data = await previewZielgruppeRecipients({
      definition: input.definition,
      page: input.page,
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Vorschau fehlgeschlagen." };
  }
}

export async function searchZielgruppePersonsAction(query: string): Promise<
  ActionResult<
    Array<{ personId: string; displayName: string; email: string | null }>
  >
> {
  try {
    const tenant = await requireZielgruppenView();
    const rows = await searchRequirementAudiencePersons(tenant.id, query);
    return {
      ok: true,
      data: rows.map((r) => ({
        personId: r.personId,
        displayName: r.displayName,
        email: r.email,
      })),
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Suche fehlgeschlagen." };
  }
}
