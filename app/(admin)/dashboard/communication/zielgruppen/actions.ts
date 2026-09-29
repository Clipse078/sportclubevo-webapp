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
import { parseBulkEmailEntries } from "@/lib/communication/external-contacts/bulk-email-parser";
import { classifyBulkEmailEntries } from "@/lib/communication/external-contacts/bulk-email-classifier";
import {
  findOrCreateCommunicationExternalContact,
  searchCommunicationExternalContacts,
} from "@/lib/communication/external-contacts/external-contact-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";

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

export async function searchZielgruppeExternalContactsAction(query: string): Promise<
  ActionResult<Array<{ id: string; label: string; description?: string | null }>>
> {
  try {
    const tenant = await requireZielgruppenView();
    const rows = await searchCommunicationExternalContacts({
      tenantId: tenant.id,
      query,
    });
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Suche fehlgeschlagen." };
  }
}

export async function classifyZielgruppeBulkEmailsAction(raw: string): Promise<
  ActionResult<Awaited<ReturnType<typeof classifyBulkEmailEntries>>>
> {
  try {
    const tenant = await requireZielgruppenView();
    const entries = parseBulkEmailEntries(raw);
    const rows = await classifyBulkEmailEntries({ tenantId: tenant.id, entries });
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Klassifizierung fehlgeschlagen." };
  }
}

export async function persistZielgruppeBulkExternalContactsAction(input: {
  emails: string[];
}): Promise<ActionResult<{ externalContactIds: string[]; personIds: string[] }>> {
  try {
    await requireAnyPermission([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE]);
    const tenant = await requireZielgruppenView();
    const session = await requireAnyPermission([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE]);
    const entries = parseBulkEmailEntries(input.emails.join("\n"));
    const classified = await classifyBulkEmailEntries({ tenantId: tenant.id, entries });
    const externalContactIds: string[] = [];
    const personIds: string[] = [];

    for (const row of classified) {
      if (row.state === "EXISTING_PERSON" && row.personId) {
        personIds.push(row.personId);
        continue;
      }
      if (row.state === "EXISTING_EXTERNAL" && row.externalContactId) {
        externalContactIds.push(row.externalContactId);
        continue;
      }
      if (row.state === "NEW_EXTERNAL" && row.normalized) {
        const created = await findOrCreateCommunicationExternalContact({
          tenantId: tenant.id,
          email: row.normalized,
          sourceKey: "ZIELGRUPPEN_BULK",
          createdByUserId: session.user.effectiveUserId ?? session.user.id,
        });
        externalContactIds.push(created.id);
      }
    }

    return { ok: true, data: { externalContactIds, personIds } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
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
