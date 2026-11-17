"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import SceInlineDestructiveConfirm from "@/components/sce/club-development/SceInlineDestructiveConfirm";
import {
  buildRoleDeletionConfirmDescription,
  formatRoleDeletionBlockerMessage,
} from "@/lib/roles/role-deletion-confirm-copy";
import type { RoleDeletionBlocker, RoleDeletionImpact } from "@/lib/roles/role-delete-service";

type RoleDeleteInlineConfirmProps = {
  roleId: string;
  roleName: string;
  roleKey: string;
  impact: RoleDeletionImpact | null;
  blocker: RoleDeletionBlocker | null;
  impactLoading: boolean;
  loadError: string | null;
  onCancel: () => void;
};

export async function fetchRoleDeletionImpact(roleId: string): Promise<{
  impact: RoleDeletionImpact | null;
  blocker: RoleDeletionBlocker | null;
  error: string | null;
}> {
  const response = await fetch(`/api/roles/${encodeURIComponent(roleId)}/permanent`, {
    method: "DELETE",
  });
  const data = await response.json().catch(() => null);

  if (response.status === 409 && data?.blocked) {
    return {
      impact: null,
      blocker: data.blocker as RoleDeletionBlocker,
      error: null,
    };
  }

  if (!response.ok) {
    return {
      impact: null,
      blocker: null,
      error: (data?.error as string | undefined) ?? "Vorschau nicht verfügbar.",
    };
  }

  return {
    impact: (data?.impact as RoleDeletionImpact | undefined) ?? null,
    blocker: null,
    error: null,
  };
}

export default function RoleDeleteInlineConfirm({
  roleId,
  roleName,
  roleKey,
  impact,
  blocker,
  impactLoading,
  loadError,
  onCancel,
}: RoleDeleteInlineConfirmProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const description = impactLoading
    ? "Auswirkungen werden geprüft…"
  : loadError
      ? loadError
      : buildRoleDeletionConfirmDescription(roleName, roleKey, impact);

  function performDelete() {
    if (impactLoading || pending || blocker) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/roles/${encodeURIComponent(roleId)}/permanent?confirm=true`,
          { method: "DELETE" },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(
            typeof data.error === "string" ? data.error : "Rolle konnte nicht gelöscht werden.",
          );
          return;
        }
        router.push("/dashboard/administration/roles");
        router.refresh();
      } catch {
        setError("Netzwerkfehler. Bitte erneut versuchen.");
      }
    });
  }

  if (blocker) {
    return (
      <div
        className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
        data-testid="role-delete-inline-confirm-host"
      >
        <div className="flex items-start gap-2">
          <ProductDomainSceIcon
            name="roles-access"
            size={16}
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          />
          <div>
            <p className="font-medium text-amber-800">Löschen nicht möglich</p>
            <p className="mt-1 text-amber-700">{formatRoleDeletionBlockerMessage(blocker)}</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium"
          onClick={onCancel}
          data-testid="role-delete-confirm-cancel"
        >
          Schließen
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2" data-testid="role-delete-inline-confirm-host">
      {!impactLoading && impact ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Dauerhaft und unwiderruflich — geschützte System- und Plattform-Rollen sind serverseitig blockiert.</span>
        </div>
      ) : null}
      <SceInlineDestructiveConfirm
        title="Rolle endgültig löschen?"
        description={description}
        confirmLabel="Endgültig löschen"
        pending={pending || impactLoading}
        error={error ?? loadError}
        onConfirm={performDelete}
        onCancel={() => {
          if (!pending) onCancel();
        }}
        testId="role-delete-confirm"
      />
    </div>
  );
}