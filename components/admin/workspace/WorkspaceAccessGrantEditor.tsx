"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Plus,
  Shield,
  User,
  Users,
  UserSquare2,
} from "lucide-react";
import { WorkspaceAccessInheritanceMode } from "@prisma/client";

import type {
  WorkspaceAccessGrantRuleDto,
  WorkspaceAccessManagementViewModel,
} from "@/lib/workspace/access/access-management-dto";
import {
  accessLevelDescriptionDe,
  accessLevelLabelDe,
  audienceKindLabelDe,
} from "@/lib/workspace/access/access-management-labels";
import {
  audienceKeyFromMutationFields,
  buildMutationFieldsFromAudienceSelection,
  grantRulesFromExplicitList,
  grantRulesToMutationPayload,
  removeGrantRuleByKey,
  type WorkspaceAudienceSearchResult,
  updateGrantRuleLevel,
  upsertGrantRule,
} from "@/lib/workspace/access/access-grant-editor-utils";
import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";
import { SceRecipientSelector } from "@/components/sce/recipient/SceRecipientSelector";
import { SCE_RECIPIENT_SELECTOR_WORKSPACE_ACCESS } from "@/lib/sce/recipient/sce-recipient-selector-config";
import { decorateWorkspaceAccessDiscoverFetch } from "@/lib/workspace/access/workspace-access-sce-discover-client";
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";

const ACCESS_LEVELS: CanonicalResourceLevel[] = ["VIEW", "EDIT", "MANAGE"];

type AudienceType = WorkspaceAudienceSearchResult["type"];

function audienceIcon(kind: AudienceType) {
  switch (kind) {
    case "ORGANISATION":
      return Building2;
    case "ORG_UNIT":
      return Users;
    case "TEAM":
      return UserSquare2;
    case "ROLE":
      return Shield;
    case "PERSON":
      return User;
    default:
      return User;
  }
}

function pickToAudienceSelection(
  pick: SceSelectorPick,
): { audienceType: AudienceType; selection: WorkspaceAudienceSearchResult | null } | null {
  if (pick.metadata?.workspaceSubjectType === "ORGANISATION") {
    return {
      audienceType: "ORGANISATION",
      selection: { type: "ORGANISATION", id: "organisation", label: pick.label },
    };
  }
  if (pick.type === "ORG_UNIT") {
    return {
      audienceType: "ORG_UNIT",
      selection: { type: "ORG_UNIT", id: pick.id, label: pick.label },
    };
  }
  if (pick.type === "TEAM") {
    return {
      audienceType: "TEAM",
      selection: { type: "TEAM", id: pick.id, label: pick.label },
    };
  }
  if (pick.type === "PERSON") {
    return {
      audienceType: "PERSON",
      selection: { type: "PERSON", id: pick.id, label: pick.label },
    };
  }
  if (pick.type === "ROLE") {
    const functionKey =
      typeof pick.metadata?.roleFunctionKey === "string" ? pick.metadata.roleFunctionKey : pick.id;
    return {
      audienceType: "ROLE",
      selection: {
        type: "ROLE",
        id: functionKey,
        label: pick.label,
        functionKey,
      },
    };
  }
  return null;
}

function subjectSecondaryLabel(type: AudienceType): string {
  if (type === "ORGANISATION") return "Organisation";
  if (type === "ORG_UNIT") return "Organisationseinheit";
  if (type === "TEAM") return "Team";
  if (type === "ROLE") return "Rolle/Funktion";
  return "Person";
}

type WorkspaceAccessGrantEditorProps = {
  apiBase: string;
  viewModel: WorkspaceAccessManagementViewModel;
  onViewModelUpdated: (next: WorkspaceAccessManagementViewModel) => void;
  onSaved?: () => void;
  onManageAccessLost?: () => void;
};

export function WorkspaceAccessGrantEditor({
  apiBase,
  viewModel,
  onViewModelUpdated,
  onSaved,
  onManageAccessLost,
}: WorkspaceAccessGrantEditorProps) {
  const t = useTranslations("Workspace.access");
  const [draftRules, setDraftRules] = useState<WorkspaceAccessGrantRuleDto[]>(() =>
    grantRulesFromExplicitList(viewModel.explicitGrants),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [addAccessLevel, setAddAccessLevel] = useState<CanonicalResourceLevel>("VIEW");
  const [pendingAudienceType, setPendingAudienceType] = useState<AudienceType | null>(null);
  const [selectedAudience, setSelectedAudience] =
    useState<WorkspaceAudienceSearchResult | null>(null);
  const [roleScopeOrgUnitId, setRoleScopeOrgUnitId] = useState<string | null>(null);
  const [roleScopeTeamId, setRoleScopeTeamId] = useState<string | null>(null);

  useEffect(() => {
    setDraftRules(grantRulesFromExplicitList(viewModel.explicitGrants));
  }, [viewModel]);

  const organisationLabel = t("organisationLabel");

  const fetchResultsDecorator = useCallback(
    (
      base: Parameters<typeof decorateWorkspaceAccessDiscoverFetch>[0],
    ) => decorateWorkspaceAccessDiscoverFetch(base, organisationLabel),
    [organisationLabel],
  );

  const effectiveByAudienceKey = useMemo(() => {
    const map = new Map<string, (typeof viewModel.effectiveAccess)[number]>();
    for (const entry of viewModel.effectiveAccess) {
      map.set(entry.audienceKey, entry);
    }
    return map;
  }, [viewModel.effectiveAccess]);

  const persistPolicy = useCallback(
    async (input: {
      mode: WorkspaceAccessInheritanceMode;
      rules: readonly WorkspaceAccessGrantRuleDto[];
    }) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(apiBase, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessInheritanceMode: input.mode,
            grants: grantRulesToMutationPayload(input.rules),
          }),
        });
        const data = (await res.json()) as {
          accessManagement?: WorkspaceAccessManagementViewModel;
          error?: string;
        };
        if (res.status === 403) {
          onManageAccessLost?.();
          throw new Error(data.error ?? t("saveError"));
        }
        if (!res.ok) {
          throw new Error(data.error ?? t("saveError"));
        }
        const next = data.accessManagement ?? null;
        if (next) {
          onViewModelUpdated(next);
          setDraftRules(grantRulesFromExplicitList(next.explicitGrants));
        }
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("saveError"));
      } finally {
        setSaving(false);
      }
    },
    [apiBase, onManageAccessLost, onSaved, onViewModelUpdated, t],
  );

  async function beginRestriction() {
    const seedRules: WorkspaceAccessGrantRuleDto[] =
      viewModel.restrictionSeedGrants.map((fields, index) => {
        const key = audienceKeyFromMutationFields(fields);
        return {
          id: `seed-${index}`,
          audienceKind: fields.subjectType,
          audienceLabel: audienceKindLabelDe(fields.subjectType),
          accessLevel: fields.accessLevel,
          accessLevelLabel: accessLevelLabelDe(fields.accessLevel),
          accessLevelDescription: accessLevelDescriptionDe(fields.accessLevel),
          mutationFields: { ...fields },
          audienceKey: key,
        };
      });
    await persistPolicy({
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      rules: seedRules,
    });
  }

  function handleSubjectPick(pick: SceSelectorPick) {
    const mapped = pickToAudienceSelection(pick);
    if (!mapped) return;
    setPendingAudienceType(mapped.audienceType);
    setSelectedAudience(mapped.selection);
    setPickerOpen(false);
  }

  async function addGrant() {
    const audienceType = pendingAudienceType ?? selectedAudience?.type;
    if (!audienceType) {
      setError(t("audienceRequired"));
      return;
    }
    const fields = buildMutationFieldsFromAudienceSelection({
      audienceType,
      selection:
        audienceType === "ORGANISATION"
          ? selectedAudience ?? {
              type: "ORGANISATION",
              id: "organisation",
              label: organisationLabel,
            }
          : selectedAudience,
      accessLevel: addAccessLevel,
      roleScopeOrgUnitId,
      roleScopeTeamId,
    });
    if (!fields) {
      setError(t("audienceRequired"));
      return;
    }
    const audienceLabel =
      audienceType === "ORGANISATION"
        ? organisationLabel
        : (selectedAudience?.label ?? audienceKindLabelDe(audienceType));
    const nextRules = upsertGrantRule(draftRules, fields, {
      audienceLabel,
      accessLevelLabel: accessLevelLabelDe(addAccessLevel),
      accessLevelDescription: accessLevelDescriptionDe(addAccessLevel),
    });
    setDraftRules(nextRules);
    await persistPolicy({
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      rules: nextRules,
    });
    setSelectedAudience(null);
    setPendingAudienceType(null);
    setRoleScopeOrgUnitId(null);
    setRoleScopeTeamId(null);
  }

  async function changeLevel(rule: WorkspaceAccessGrantRuleDto, level: CanonicalResourceLevel) {
    const nextRules = updateGrantRuleLevel(draftRules, rule.audienceKey, level, {
      accessLevelLabel: accessLevelLabelDe(level),
      accessLevelDescription: accessLevelDescriptionDe(level),
    });
    setDraftRules(nextRules);
    await persistPolicy({
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      rules: nextRules,
    });
  }

  async function removeRule(rule: WorkspaceAccessGrantRuleDto) {
    const nextRules = removeGrantRuleByKey(draftRules, rule.audienceKey);
    setDraftRules(nextRules);
    await persistPolicy({
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      rules: nextRules,
    });
  }

  const editorEnabled =
    viewModel.policyMode === WorkspaceAccessInheritanceMode.EXPLICIT;

  const pendingType = pendingAudienceType ?? selectedAudience?.type;
  const PendingIcon = pendingType ? audienceIcon(pendingType) : User;

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-sm text-[var(--sce-danger)]">
          {error}
        </p>
      ) : null}

      {!editorEnabled ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-sm">
          <p className="text-[var(--text-2)]">{t("inheritModeHint")}</p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void beginRestriction()}
            className="fca-button-secondary mt-3 text-sm disabled:opacity-60"
          >
            {saving ? t("saving") : t("restrictHereButton")}
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="workspace-grants-heading">
            <h3 id="workspace-grants-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("directGrantsHeading")}
            </h3>
            <ul className="mt-2 space-y-2">
              {draftRules.map((rule) => {
                const Icon = audienceIcon(rule.audienceKind);
                const effective = effectiveByAudienceKey.get(rule.audienceKey);
                const capped =
                  effective?.cappedByAncestor &&
                  effective.effectiveLevel !== rule.accessLevel;
                return (
                  <li
                    key={rule.audienceKey}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium text-[var(--text)]">
                          <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                          <span className="truncate">{rule.audienceLabel}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {subjectSecondaryLabel(rule.audienceKind)} · {rule.accessLevelLabel}
                        </p>
                        {effective ? (
                          <p className="mt-1 text-xs text-[var(--text-2)]">
                            {effective.isInherited ? t("inheritedBadge") : t("directGrantsHeading")} ·{" "}
                            {effective.effectiveLevelLabel}
                            {effective.sourceLabel ? ` — ${effective.sourceLabel}` : ""}
                          </p>
                        ) : null}
                        {capped && effective?.ancestorCapLabel ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {effective.ancestorCapLabel}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                          {t("accessLevelField")}
                          <select
                            className="fca-input mt-1 block min-w-[8.5rem] text-sm"
                            value={rule.accessLevel}
                            disabled={saving}
                            aria-label={t("accessLevelField")}
                            onChange={(event) =>
                              void changeLevel(
                                rule,
                                event.target.value as CanonicalResourceLevel,
                              )
                            }
                          >
                            {ACCESS_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {accessLevelLabelDe(level)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void removeRule(rule)}
                          className="text-xs text-[var(--sce-danger)] hover:underline disabled:opacity-60"
                        >
                          {t("removeGrant")}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {draftRules.length === 0 ? (
                <li className="text-sm text-[var(--muted)]">{t("noExplicitGrants")}</li>
              ) : null}
            </ul>
          </section>

          <section
            aria-labelledby="workspace-add-grant-heading"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3"
          >
            <h3 id="workspace-add-grant-heading" className="text-sm font-semibold text-[var(--text)]">
              {t("addGrantButton")}
            </h3>

            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-[var(--text-2)]">{t("audienceSearchField")}</p>
                {selectedAudience ? (
                  <div className="mt-1 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                    <PendingIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{selectedAudience.label}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {pendingType ? subjectSecondaryLabel(pendingType) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-[var(--primary)] hover:underline"
                      onClick={() => {
                        setSelectedAudience(null);
                        setPendingAudienceType(null);
                      }}
                    >
                      {t("searchButton")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="fca-button-secondary mt-1 inline-flex items-center gap-1 text-sm"
                    disabled={saving}
                    onClick={() => setPickerOpen(true)}
                    data-testid="workspace-access-subject-add"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {SCE_RECIPIENT_SELECTOR_WORKSPACE_ACCESS.addButtonLabel}
                  </button>
                )}
              </div>

              <label className="block text-xs font-medium text-[var(--text-2)]">
                {t("accessLevelField")}
                <select
                  className="fca-input mt-1 block w-full text-sm"
                  value={addAccessLevel}
                  aria-label={t("accessLevelField")}
                  onChange={(event) =>
                    setAddAccessLevel(event.target.value as CanonicalResourceLevel)
                  }
                >
                  {ACCESS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {accessLevelLabelDe(level)}
                    </option>
                  ))}
                </select>
              </label>

              {pendingType === "ROLE" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-[var(--text-2)]">
                    {t("roleScopeOrgUnit")}
                    <input
                      type="search"
                      className="fca-input mt-1 block w-full text-sm"
                      placeholder={t("roleScopeOptional")}
                      onBlur={async (event) => {
                        const q = event.target.value.trim();
                        if (!q) {
                          setRoleScopeOrgUnitId(null);
                          return;
                        }
                        const params = new URLSearchParams({ type: "ORG_UNIT", q });
                        const res = await fetch(
                          `/api/workspace/access/audiences?${params.toString()}`,
                        );
                        const data = (await res.json()) as {
                          results?: WorkspaceAudienceSearchResult[];
                        };
                        setRoleScopeOrgUnitId(data.results?.[0]?.id ?? null);
                      }}
                    />
                  </label>
                  <label className="text-xs font-medium text-[var(--text-2)]">
                    {t("roleScopeTeam")}
                    <input
                      type="search"
                      className="fca-input mt-1 block w-full text-sm"
                      placeholder={t("roleScopeOptional")}
                      onBlur={async (event) => {
                        const q = event.target.value.trim();
                        if (!q) {
                          setRoleScopeTeamId(null);
                          return;
                        }
                        const params = new URLSearchParams({ type: "TEAM", q });
                        const res = await fetch(
                          `/api/workspace/access/audiences?${params.toString()}`,
                        );
                        const data = (await res.json()) as {
                          results?: WorkspaceAudienceSearchResult[];
                        };
                        setRoleScopeTeamId(data.results?.[0]?.id ?? null);
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <SceRecipientSelector
              profile={SCE_RECIPIENT_SELECTOR_WORKSPACE_ACCESS}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              mode="single"
              onPick={handleSubjectPick}
              disabled={saving}
              testIdPrefix="workspace-access-subject-selector"
              fetchResultsDecorator={fetchResultsDecorator}
            />

            <button
              type="button"
              disabled={saving}
              onClick={() => void addGrant()}
              className="fca-button-primary mt-3 text-sm disabled:opacity-60"
            >
              {saving ? t("saving") : t("addGrantButton")}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
