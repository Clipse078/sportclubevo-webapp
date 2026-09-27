"use server";

import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  searchRequirementAudienceOrgUnits,
  searchRequirementAudienceRoles,
  searchRequirementAudienceTeams,
} from "@/lib/requirements/audience-selector-search";
import { searchRequirementAudiencePersons } from "@/lib/requirements/person-search";

type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function requireZielgruppenView() {
  await requireAnyPermission([
    PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW,
    PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE,
  ]);
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
