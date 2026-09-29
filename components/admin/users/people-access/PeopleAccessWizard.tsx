"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight } from "lucide-react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import EffectiveAccessSummary from "@/components/admin/users/EffectiveAccessSummary";
import PeopleAccessPermissionPanel from "@/components/admin/users/people-access/PeopleAccessPermissionPanel";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/NavAlignedPermissionEditor";
import type { EffectiveAccessModuleGroup } from "@/lib/roles/effective-access-summary";
import {
  dedupeAssignableRolesForWizard,
  normalizeRoleIdsForAssignment,
} from "@/lib/admin/people-access/wizard-assignable-roles";
import {
  getRoleProductDescription,
  isClubAdminRoleKey,
} from "@/lib/admin/people-access/role-product-copy";
import {
  buildNavPermissionPresentationFromModuleGroups,
  buildNavPermissionSummary,
} from "@/lib/roles/nav-permission-presentation";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";

export type WizardRoleOption = {
  id: string;
  name: string;
  key: string;
  isSystem: boolean;
  description: string | null;
};

export type WizardOrgUnitOption = { id: string; name: string };

type ScopedDraft = {
  roleId: string;
  orgUnitId: string;
  scopeMode: "THIS_ORG_UNIT" | "THIS_ORG_UNIT_AND_DESCENDANTS";
};

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; kind: string; userId?: string; personId?: string; name: string; email: string; pendingInvitation?: boolean }
  | { status: "error" };

export type PeopleAccessWizardProps = {
  availableRoles: WizardRoleOption[];
  availableOrgUnits: WizardOrgUnitOption[];
  permissionModuleGroups?: PermissionMatrixModuleGroup[];
  clubAdminRoleKey: string;
  privilegedRoleIds: string[];
  initialPersonId?: string;
  initialEmail?: string;
  mode?: "invite" | "edit";
  editUserId?: string;
  onComplete: (userId: string) => void;
  onCancel: () => void;
};

const STEPS = ["Person", "Funktion & Bereich", "Zugriff", "Prüfen & Einladen"] as const;

export default function PeopleAccessWizard({
  availableRoles,
  availableOrgUnits,
  permissionModuleGroups = [],
  clubAdminRoleKey,
  privilegedRoleIds,
  initialPersonId = "",
  initialEmail = "",
  mode = "invite",
  editUserId,
  onComplete,
  onCancel,
}: PeopleAccessWizardProps) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [linkedPersonId, setLinkedPersonId] = useState(initialPersonId);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [scopedDrafts, setScopedDrafts] = useState<ScopedDraft[]>([]);
  const [privilegedConfirmed, setPrivilegedConfirmed] = useState(false);
  const [previewGroups, setPreviewGroups] = useState<EffectiveAccessModuleGroup[]>([]);
  const [previewPermissionKeys, setPreviewPermissionKeys] = useState<string[]>([]);
  const [previewRoleNamesByKey, setPreviewRoleNamesByKey] = useState<
    Record<string, readonly string[]>
  >({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFieldState, setEmailFieldState] = useState<
    "neutral" | "checking" | "valid" | "invalid" | "warning"
  >("neutral");
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

  const assignableRoles = useMemo(() => {
    const filtered = availableRoles.filter(
      (r) => r.key !== "super_admin" && r.key !== "platform_admin",
    );
    return dedupeAssignableRolesForWizard(filtered, clubAdminRoleKey);
  }, [availableRoles, clubAdminRoleKey]);

  const scopedEligibleRoles = useMemo(
    () => assignableRoles.filter((r) => !isClubAdminRoleKey(r.key, clubAdminRoleKey)),
    [assignableRoles, clubAdminRoleKey],
  );

  const selectedRoles = assignableRoles.filter((r) => selectedRoleIds.includes(r.id));

  const requiresPrivilegedConfirm = useMemo(() => {
    const privileged = new Set(privilegedRoleIds);
    return selectedRoleIds.some((id) => privileged.has(id));
  }, [selectedRoleIds, privilegedRoleIds]);

  const applyClientEmailValidation = useCallback((value: string) => {
    const result = validateInvitationEmailSyntax(value);
    if (result.ok) {
      setEmailFieldState("valid");
      setEmailFieldError(null);
      setEmailSuggestion(null);
      return true;
    }
    setEmailFieldState(result.suggestion ? "warning" : "invalid");
    setEmailFieldError(result.message ?? "Ungültige E-Mail-Adresse.");
    setEmailSuggestion(result.suggestion ?? null);
    return false;
  }, []);

  const validateEmailOnServer = useCallback(async (value: string) => {
    setEmailFieldState("checking");
    try {
      const res = await fetch("/api/admin/users/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        suggestion?: string;
        normalized?: string;
      };
      if (data.ok) {
        setEmailFieldState("valid");
        setEmailFieldError(null);
        setEmailSuggestion(null);
        if (typeof data.normalized === "string" && data.normalized) {
          setEmail(data.normalized);
        }
        return true;
      }
      setEmailFieldState(data.suggestion ? "warning" : "invalid");
      setEmailFieldError(data.error ?? "Ungültige E-Mail-Adresse.");
      setEmailSuggestion(data.suggestion ?? null);
      return false;
    } catch {
      setEmailFieldState("invalid");
      setEmailFieldError("Die E-Mail-Domain konnte gerade nicht geprüft werden. Bitte versuche es erneut.");
      return false;
    }
  }, []);

  const runEmailLookup = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || mode === "edit") {
      setLookup({ status: "idle" });
      return;
    }
    if (!validateInvitationEmailSyntax(trimmed).ok) {
      setLookup({ status: "idle" });
      return;
    }
    setLookup({ status: "loading" });
    try {
      const res = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      const result = data.result;
      if (!result || result.kind === "not_found") {
        setLookup({ status: "idle" });
        return;
      }
      if (result.kind === "person_other_tenant") {
        setLookup({ status: "idle" });
        return;
      }
      if (result.kind === "person_without_access") {
        setLookup({
          status: "found",
          kind: result.kind,
          personId: result.personId,
          name: `${result.firstName} ${result.lastName}`.trim(),
          email: result.email ?? trimmed,
        });
        setLinkedPersonId(result.personId);
        setFirstName(result.firstName);
        setLastName(result.lastName);
        return;
      }
      if (result.kind === "active_member") {
        setLookup({
          status: "found",
          kind: result.kind,
          userId: result.userId,
          personId: result.personId ?? undefined,
          name: `${result.firstName} ${result.lastName}`.trim(),
          email: result.email,
          pendingInvitation: result.pendingInvitation,
        });
        setFirstName(result.firstName);
        setLastName(result.lastName);
      }
    } catch {
      setLookup({ status: "error" });
    }
  }, [mode]);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = email.trim();
      if (trimmed.length >= 3 && validateInvitationEmailSyntax(trimmed).ok) {
        void runEmailLookup(trimmed);
      } else {
        setLookup({ status: "idle" });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [email, runEmailLookup]);

  useEffect(() => {
    if (step !== 2 && step !== 3) return;
    const normalizedIds = normalizeRoleIdsForAssignment(
      selectedRoleIds,
      availableRoles,
      clubAdminRoleKey,
    );
    setPreviewLoading(true);
    fetch("/api/tenant/effective-access/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds: normalizedIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        setPreviewGroups(data.summary ?? []);
        setPreviewPermissionKeys(
          Array.isArray(data.permissionKeys)
            ? data.permissionKeys.filter((k: unknown) => typeof k === "string")
            : [],
        );
        setPreviewRoleNamesByKey(
          data.roleNamesByKey && typeof data.roleNamesByKey === "object"
            ? data.roleNamesByKey
            : {},
        );
      })
      .catch(() => {
        setPreviewGroups([]);
        setPreviewPermissionKeys([]);
        setPreviewRoleNamesByKey({});
      })
      .finally(() => setPreviewLoading(false));
  }, [step, selectedRoleIds, availableRoles, clubAdminRoleKey]);

  function toggleRole(roleId: string) {
    setPrivilegedConfirmed(false);
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  }

  function addScopedDraft() {
    const roleId = scopedEligibleRoles[0]?.id ?? "";
    const orgUnitId = availableOrgUnits[0]?.id ?? "";
    if (!roleId || !orgUnitId) return;
    setScopedDrafts((prev) => [...prev, { roleId, orgUnitId, scopeMode: "THIS_ORG_UNIT" }]);
  }

  async function submit(sendInvitation: boolean) {
    setError(null);
    setPending(true);
    try {
      const normalizedRoleIds = normalizeRoleIdsForAssignment(
        selectedRoleIds,
        availableRoles,
        clubAdminRoleKey,
      );
      const body: Record<string, unknown> = {
        sendInvitation,
        roleIds: normalizedRoleIds,
        scopedRoles: scopedDrafts.map((d) => ({
          ...d,
          roleId: normalizeRoleIdsForAssignment([d.roleId], availableRoles, clubAdminRoleKey)[0] ?? d.roleId,
        })),
      };

      if (mode === "edit" && editUserId) {
        const res = await fetch(`/api/admin/users/${editUserId}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleIds: normalizeRoleIdsForAssignment(
              selectedRoleIds,
              availableRoles,
              clubAdminRoleKey,
            ),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Speichern fehlgeschlagen.");
          return;
        }
        onComplete(editUserId);
        return;
      }

      if (linkedPersonId) {
        body.personId = linkedPersonId;
      } else {
        body.firstName = firstName.trim();
        body.lastName = lastName.trim();
        body.email = email.trim();
      }

      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      onComplete(data.userId as string);
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setPending(false);
    }
  }

  const emailSyntaxReady =
    Boolean(email.trim()) && validateInvitationEmailSyntax(email).ok;

  const canAdvanceStep0 =
    mode === "edit" ||
    linkedPersonId ||
    (firstName.trim() && lastName.trim() && emailSyntaxReady);

  async function handleNextFromStep() {
    if (step === 0 && mode === "invite" && !linkedPersonId) {
      const clientOk = applyClientEmailValidation(email);
      if (!clientOk) {
        document.getElementById("wizard-email")?.focus();
        return;
      }
      const serverOk = await validateEmailOnServer(email);
      if (!serverOk) {
        document.getElementById("wizard-email")?.focus();
        return;
      }
    }
    setStep((s) => s + 1);
  }

  const primaryRoleLabel =
    selectedRoles.length === 1
      ? selectedRoles[0]?.name
      : selectedRoles.length > 1
        ? selectedRoles.map((r) => r.name).join(", ")
        : undefined;

  const scopeLabel = useMemo(() => {
    if (selectedRoles.some((r) => isClubAdminRoleKey(r.key, clubAdminRoleKey))) {
      return "Gesamter Verein";
    }
    if (scopedDrafts[0]) {
      return availableOrgUnits.find((u) => u.id === scopedDrafts[0].orgUnitId)?.name;
    }
    return undefined;
  }, [selectedRoles, scopedDrafts, availableOrgUnits, clubAdminRoleKey]);

  const reviewNavSummary = useMemo(() => {
    if (permissionModuleGroups.length === 0 || previewPermissionKeys.length === 0) return [];
    const presentation = buildNavPermissionPresentationFromModuleGroups(permissionModuleGroups);
    return buildNavPermissionSummary(presentation, new Set(previewPermissionKeys));
  }, [permissionModuleGroups, previewPermissionKeys]);

  const existingAccessBlocksInvite =
    lookup.status === "found" && lookup.kind === "active_member" && mode === "invite";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol className="mb-4 flex flex-wrap items-center gap-2 px-1" aria-label="Assistent-Schritte">
        {STEPS.map((label, idx) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                idx <= step
                  ? "bg-[var(--blue,#2563EB)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--muted)]"
              }`}
            >
              {idx < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : idx + 1}
            </span>
            <span
              className={`text-sm font-medium ${
                idx === step ? "text-[var(--foreground)]" : "text-[var(--muted)]"
              }`}
            >
              {label}
            </span>
            {idx < STEPS.length - 1 ? (
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-6 px-1">
        {step === 0 && mode === "invite" ? (
          <>
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Person</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                E-Mail-Adresse eingeben — bestehende Personen werden erkannt.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="wizard-email" className="mb-1 block text-xs font-medium">
                  E-Mail-Adresse *
                </label>
                <input
                  id="wizard-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailFieldState !== "neutral") {
                      setEmailFieldState("neutral");
                      setEmailFieldError(null);
                      setEmailSuggestion(null);
                    }
                  }}
                  onBlur={() => {
                    if (email.trim()) applyClientEmailValidation(email);
                  }}
                  className="fca-input w-full"
                  autoComplete="email"
                  spellCheck={false}
                  aria-invalid={emailFieldState === "invalid" || emailFieldState === "warning"}
                  aria-describedby={
                    emailFieldError ? "wizard-email-error wizard-email-suggestion" : undefined
                  }
                />
                {emailFieldState === "checking" ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">E-Mail wird geprüft…</p>
                ) : null}
                {emailFieldError ? (
                  <p id="wizard-email-error" className="mt-1 text-xs text-red-600" role="alert">
                    {emailFieldError}
                  </p>
                ) : null}
                {emailSuggestion ? (
                  <div id="wizard-email-suggestion" className="mt-2 text-xs text-[var(--muted)]">
                    <p>Meintest du:</p>
                    <button
                      type="button"
                      className="mt-1 font-medium text-[var(--blue,#2563EB)] underline"
                      onClick={() => {
                        setEmail(emailSuggestion);
                        setEmailSuggestion(null);
                        void validateEmailOnServer(emailSuggestion);
                      }}
                    >
                      {emailSuggestion}
                    </button>
                    <span className="ml-1">?</span>
                  </div>
                ) : null}
              </div>
              <div>
                <label htmlFor="wizard-firstName" className="mb-1 block text-xs font-medium">
                  Vorname
                </label>
                <input
                  id="wizard-firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="fca-input w-full"
                  disabled={Boolean(linkedPersonId && lookup.status === "found")}
                />
              </div>
              <div>
                <label htmlFor="wizard-lastName" className="mb-1 block text-xs font-medium">
                  Nachname
                </label>
                <input
                  id="wizard-lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="fca-input w-full"
                  disabled={Boolean(linkedPersonId && lookup.status === "found")}
                />
              </div>
            </div>

            {lookup.status === "loading" ? (
              <p className="text-sm text-[var(--muted)]">Suche…</p>
            ) : null}

            {lookup.status === "found" && lookup.kind === "person_without_access" ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">Person bereits vorhanden</p>
                <p className="mt-1 text-sm">{lookup.name}</p>
                <p className="text-sm text-[var(--muted)]">{lookup.email}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">Bestehende Person wird verwendet.</p>
              </div>
            ) : null}

            {existingAccessBlocksInvite ? (
              <div
                className="rounded-[var(--radius-lg)] border border-amber-500/40 bg-[var(--surface-2)] p-4"
                role="alert"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Diese Person hat bereits Zugang zu SportClubEvo.
                </p>
                {lookup.pendingInvitation ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">Einladung ausstehend.</p>
                ) : null}
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Schließe den Assistenten ab und öffne die Person in der Liste, um den Zugriff zu bearbeiten.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 0 && mode === "edit" ? (
          <p className="text-sm text-[var(--muted)]">Rollen und Bereiche für diese Person anpassen.</p>
        ) : null}

        {step === 1 ? (
          <>
            <div>
              <h3 className="text-lg font-semibold">Funktion & Bereich</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Welche Funktion hat diese Person im Verein?
              </p>
            </div>
            <ul className="space-y-2">
              {assignableRoles.map((role) => {
                const isClubAdmin = isClubAdminRoleKey(role.key, clubAdminRoleKey);
                const checked = selectedRoleIds.includes(role.id);
                return (
                  <li key={role.id}>
                    <label className="flex cursor-pointer gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface-2)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                        className="mt-1 h-4 w-4"
                        aria-describedby={`role-desc-${role.id}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{role.name}</span>
                        <span id={`role-desc-${role.id}`} className="mt-0.5 block text-xs text-[var(--muted)]">
                          {getRoleProductDescription({ key: role.key, description: role.description })}
                        </span>
                        {isClubAdmin ? (
                          <span className="mt-1 block text-xs font-medium text-amber-700">
                            Geltungsbereich: Gesamter Verein
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {requiresPrivilegedConfirm ? (
              <div
                className="rounded-[var(--radius-lg)] border border-amber-500/40 bg-[var(--surface-2)] p-4"
                role="alert"
              >
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Vereinsweiter administrativer Zugriff
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Diese Person kann Personen, Rollen, Zugänge und vereinsweite Einstellungen verwalten.
                    </p>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={privilegedConfirmed}
                        onChange={(e) => setPrivilegedConfirmed(e.target.checked)}
                      />
                      Ich bestätige diese Zuweisung.
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {availableOrgUnits.length > 0 && scopedEligibleRoles.length > 0 ? (
              <div className="space-y-3 border-t border-[var(--border)] pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Wo gilt diese Funktion?</p>
                  <button type="button" onClick={addScopedDraft} className="text-xs font-medium text-[var(--blue,#2563EB)]">
                    + Bereich
                  </button>
                </div>
                {scopedDrafts.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">Optional: Organisationseinheit oder Team zuweisen.</p>
                ) : null}
                {scopedDrafts.map((draft, idx) => (
                  <div key={idx} className="grid gap-2 rounded-[var(--radius-lg)] bg-[var(--surface-2)] p-3 sm:grid-cols-3">
                    <select
                      value={draft.roleId}
                      onChange={(e) => {
                        const next = [...scopedDrafts];
                        next[idx] = { ...next[idx], roleId: e.target.value };
                        setScopedDrafts(next);
                      }}
                      className="fca-input text-sm"
                      aria-label="Funktion"
                    >
                      {scopedEligibleRoles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <select
                      value={draft.orgUnitId}
                      onChange={(e) => {
                        const next = [...scopedDrafts];
                        next[idx] = { ...next[idx], orgUnitId: e.target.value };
                        setScopedDrafts(next);
                      }}
                      className="fca-input text-sm"
                      aria-label="Organisationseinheit suchen"
                    >
                      {availableOrgUnits.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <select
                      value={draft.scopeMode}
                      onChange={(e) => {
                        const next = [...scopedDrafts];
                        next[idx] = {
                          ...next[idx],
                          scopeMode: e.target.value as ScopedDraft["scopeMode"],
                        };
                        setScopedDrafts(next);
                      }}
                      className="fca-input text-sm"
                      aria-label="Geltungsbereich"
                    >
                      <option value="THIS_ORG_UNIT">Nur dieser Bereich</option>
                      <option value="THIS_ORG_UNIT_AND_DESCENDANTS">Inkl. Unterbereiche</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <h3 className="text-lg font-semibold">Zugriff</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Die gewählte Funktion gibt die empfohlenen Zugriffe vor. Du kannst einzelne Zugriffe hier
                prüfen — Anpassungen erfolgen über die Funktion in Schritt 2, bis individuelle Overrides
                verfügbar sind.
              </p>
            </div>
            {previewLoading ? (
              <p className="text-sm text-[var(--muted)]">Zugriffe werden berechnet…</p>
            ) : permissionModuleGroups.length > 0 ? (
              <PeopleAccessPermissionPanel
                moduleGroups={permissionModuleGroups}
                permissionKeys={previewPermissionKeys}
                roleNamesByKey={previewRoleNamesByKey}
                primaryRoleLabel={primaryRoleLabel}
                scopeLabel={scopeLabel}
              />
            ) : (
              <EffectiveAccessSummary groups={previewGroups} loading={previewLoading} />
            )}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div>
              <h3 className="text-lg font-semibold">Prüfen & Einladen</h3>
            </div>
            <div className="space-y-4 rounded-[var(--radius-xl)] bg-[var(--surface-2)] p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Person</p>
                <p className="font-medium">{firstName} {lastName}</p>
                <p className="text-[var(--muted)]">{email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Funktion</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {selectedRoles.map((r) => (
                    <li key={r.id} className="sce-role-badge sce-role-badge-member">{r.name}</li>
                  ))}
                </ul>
              </div>
              {scopedDrafts.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Bereich</p>
                  <ul className="mt-1 space-y-1">
                    {scopedDrafts.map((d, i) => {
                      const role = assignableRoles.find((r) => r.id === d.roleId);
                      const unit = availableOrgUnits.find((u) => u.id === d.orgUnitId);
                      return <li key={i}>{role?.name} · {unit?.name}</li>;
                    })}
                  </ul>
                </div>
              ) : selectedRoles.some((r) => isClubAdminRoleKey(r.key, clubAdminRoleKey)) ? (
                <p className="text-[var(--muted)]">Bereich: Gesamter Verein</p>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Effektiver Zugriff</p>
                <EffectiveAccessSummary groups={previewGroups} loading={previewLoading} compact />
                {reviewNavSummary.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                    {reviewNavSummary.flatMap((section) =>
                      section.items.map((item) => (
                        <li key={`${section.label}-${item.label}-${item.access}`}>
                          + {item.label}: {item.access}
                        </li>
                      )),
                    )}
                  </ul>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <button type="button" onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)} className="fca-button-secondary text-sm">
          {step === 0 ? "Abbrechen" : "Zurück"}
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => void handleNextFromStep()}
            disabled={
              (step === 0 && !canAdvanceStep0) ||
              (step === 0 && existingAccessBlocksInvite) ||
              (step === 0 &&
                (emailFieldState === "checking" ||
                  emailFieldState === "invalid" ||
                  emailFieldState === "warning")) ||
              (step === 1 && requiresPrivilegedConfirm && !privilegedConfirmed)
            }
            className="fca-button-primary text-sm"
          >
            Weiter
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mode === "invite" ? (
              <>
                <button type="button" onClick={() => submit(false)} disabled={pending} className="fca-button-secondary text-sm">
                  Speichern ohne Einladung
                </button>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={pending || !email.trim() || existingAccessBlocksInvite}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--blue,#2563EB)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <ProductDomainSceIcon name="communication" size={12} />
                  {pending ? "Wird gesendet…" : "Einladung senden"}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => submit(false)} disabled={pending} className="fca-button-primary text-sm">
                Änderungen speichern
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
