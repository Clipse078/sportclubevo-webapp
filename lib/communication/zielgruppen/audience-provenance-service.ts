/**
 * SCE-ZIELGRUPPEN-02 — explainable inclusion paths for Zielgruppe preview.
 */

import { prisma } from "@/lib/db/prisma";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import {
  buildStructuralExclusionFromEditor,
  editorDefinitionToAudienceSpec,
} from "@/lib/communication/zielgruppen/rule-mapper";
import { resolveStructuralAudiencePersonIds } from "@/lib/communication/platform/recipient-resolution/structural-resolution";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import { domainAudienceReferenceIsEmpty } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  buildDomainAudienceMaterializationContext,
  domainAudienceProvenanceLabel,
  materializeDomainAudiencesInSpec,
} from "@/lib/communication/platform/audience/domain-audience-expansion";

export type RecipientProvenancePath = {
  code:
    | "WHOLE_ORGANISATION"
    | "ORG_UNIT"
    | "TEAM"
    | "ROLE"
    | "DIRECT_PERSON"
    | "DIRECT_EXTERNAL"
    | "DOMAIN_AUDIENCE"
    | "EXCLUDED_PERSON"
    | "EXCLUDED_EXTERNAL";
  label: string;
};

export type ZielgruppePreviewRecipientRow = {
  kind: "PERSON" | "EXTERNAL";
  personId?: string;
  externalContactId?: string;
  displayName: string;
  email?: string | null;
  includedPaths: RecipientProvenancePath[];
  excluded?: boolean;
};

async function labelMaps(tenantId: string, definition: ZielgruppeEditorDefinition) {
  const [orgUnits, teams, roles] = await Promise.all([
    definition.orgUnitIds.length
      ? prisma.orgUnit.findMany({
          where: { tenantId, id: { in: definition.orgUnitIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    definition.teamIds.length
      ? prisma.team.findMany({
          where: { tenantId, id: { in: definition.teamIds } },
          select: { id: true, name: true, shortName: true },
        })
      : Promise.resolve([]),
    definition.roleIds.length
      ? prisma.role.findMany({
          where: { tenantId, id: { in: definition.roleIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    orgUnit: new Map(orgUnits.map((o) => [o.id, o.name])),
    team: new Map(teams.map((t) => [t.id, t.shortName?.trim() || t.name])),
    role: new Map(roles.map((r) => [r.id, r.name])),
  };
}

export async function buildZielgruppePreviewProvenance(input: {
  tenantId: string;
  definition: ZielgruppeEditorDefinition;
  roleKeys: string[];
  senderUserId: string;
  effectivePersonIds: readonly string[];
  externalContactIds: readonly string[];
}): Promise<ZielgruppePreviewRecipientRow[]> {
  const labels = await labelMaps(input.tenantId, input.definition);
  const audience = editorDefinitionToAudienceSpec(input.definition, input.roleKeys);
  const structuralExclusion =
    buildStructuralExclusionFromEditor(input.definition, []) ?? undefined;

  const pathSets = new Map<string, RecipientProvenancePath[]>();

  function addPath(personId: string, path: RecipientProvenancePath) {
    const existing = pathSets.get(personId) ?? [];
    if (!existing.some((p) => p.code === path.code && p.label === path.label)) {
      existing.push(path);
    }
    pathSets.set(personId, existing);
  }

  if (input.definition.wholeOrganisation) {
    for (const personId of input.effectivePersonIds) {
      addPath(personId, { code: "WHOLE_ORGANISATION", label: "Gesamter Verein" });
    }
  }

  for (const orgUnitId of input.definition.orgUnitIds) {
    const ids = await resolveStructuralAudiencePersonIds({
      tenantId: input.tenantId,
      selectors: { orgUnitIds: [orgUnitId] },
      mode: "UNION",
    });
    const label = labels.orgUnit.get(orgUnitId) ?? "Organisationseinheit";
    for (const personId of ids) {
      if (input.effectivePersonIds.includes(personId)) {
        addPath(personId, { code: "ORG_UNIT", label: `Organisation ${label}` });
      }
    }
  }

  for (const teamId of input.definition.teamIds) {
    const ids = await resolveStructuralAudiencePersonIds({
      tenantId: input.tenantId,
      selectors: { teamIds: [teamId] },
      mode: "UNION",
    });
    const label = labels.team.get(teamId) ?? "Team";
    for (const personId of ids) {
      if (input.effectivePersonIds.includes(personId)) {
        addPath(personId, { code: "TEAM", label: `Team ${label}` });
      }
    }
  }

  for (const personId of input.definition.includePersonIds) {
    if (input.effectivePersonIds.includes(personId)) {
      addPath(personId, { code: "DIRECT_PERSON", label: "Direkt hinzugefügt" });
    }
  }

  const domainComponents = audience.components.filter(
    (component) =>
      component.domainAudience && !domainAudienceReferenceIsEmpty(component.domainAudience),
  );
  if (domainComponents.length > 0) {
    const materialization = await buildDomainAudienceMaterializationContext({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
    });
    for (const component of domainComponents) {
      const ref = component.domainAudience!;
      const label = domainAudienceProvenanceLabel({
        reference: ref,
        fallbackSourceLabel: ref.displayLabel,
      });
      const expanded = await materializeDomainAudiencesInSpec(
        { composition: "UNION", components: [component] },
        materialization,
      );
      const expandedComponent = expanded.components[0];
      if (!expandedComponent) continue;
      const explicitIds = expandedComponent.explicit?.includePersonIds ?? [];
      for (const personId of explicitIds) {
        if (input.effectivePersonIds.includes(personId)) {
          addPath(personId, { code: "DOMAIN_AUDIENCE", label });
        }
      }
      if (expandedComponent.structural) {
        const structuralIds = await resolveStructuralAudiencePersonIds({
          tenantId: input.tenantId,
          selectors: expandedComponent.structural,
          mode: "UNION",
        });
        for (const personId of structuralIds) {
          if (input.effectivePersonIds.includes(personId)) {
            addPath(personId, { code: "DOMAIN_AUDIENCE", label });
          }
        }
      }
    }
  }

  const excludedSet = new Set(input.definition.excludePersonIds);
  const resolution = await resolveAudienceCandidates({
    tenantId: input.tenantId,
    audience,
    structuralExclusionSelectors: structuralExclusion,
  });
  for (const excluded of resolution.excludedRecipients) {
    if (excluded.reasonCodes.includes("EXPLICITLY_EXCLUDED")) {
      excludedSet.add(excluded.personId);
    }
  }

  const persons =
    input.effectivePersonIds.length > 0
      ? await prisma.person.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.effectivePersonIds] } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        })
      : [];

  const externals =
    input.externalContactIds.length > 0
      ? await prisma.communicationExternalContact.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.externalContactIds] } },
          select: {
            id: true,
            emailNormalized: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        })
      : [];

  const personRows: ZielgruppePreviewRecipientRow[] = persons.map((person) => {
    const displayName =
      person.displayName?.trim() || `${person.firstName} ${person.lastName}`.trim();
    const paths = pathSets.get(person.id) ?? [];
    if (paths.length === 0 && !excludedSet.has(person.id)) {
      paths.push({ code: "ROLE", label: "Organisationsstruktur" });
    }
    return {
      kind: "PERSON",
      personId: person.id,
      displayName,
      email: person.email,
      includedPaths: paths,
      excluded: excludedSet.has(person.id),
    };
  });

  const externalRows: ZielgruppePreviewRecipientRow[] = externals.map((contact) => ({
    kind: "EXTERNAL",
    externalContactId: contact.id,
    displayName:
      contact.displayName?.trim() ||
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() ||
      contact.emailNormalized,
    email: contact.emailNormalized,
    includedPaths: [{ code: "DIRECT_EXTERNAL", label: "Direkt hinzugefügt" }],
  }));

  return [...personRows, ...externalRows].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "de"),
  );
}
