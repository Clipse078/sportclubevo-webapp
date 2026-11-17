"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import RoleDeleteInlineConfirm, { fetchRoleDeletionImpact } from "@/components/admin/roles/RoleDeleteInlineConfirm";
import type { RoleDeletionBlocker, RoleDeletionImpact } from "@/lib/roles/role-delete-service";

type RoleDeleteButtonProps = {
  roleId: string;
  roleName: string;
  roleKey: string;
};

/**
 * RoleDeleteButton — permanent-delete action for a tenant Role (ADMIN-HARD-DELETE-UI).
 *
 * Inline confirmation only (no Dialog / focus trap).
 * Blocked for: system roles (isSystem=true), PLATFORM-scoped roles.
 */
export default function RoleDeleteButton({ roleId, roleName, roleKey }: RoleDeleteButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<RoleDeletionImpact | null>(null);
  const [blocker, setBlocker] = useState<RoleDeletionBlocker | null>(null);

  async function beginDeleteConfirm() {
    setConfirmOpen(true);
    setError(null);
    setImpact(null);
    setBlocker(null);
    setLoadingImpact(true);

    try {
      const preview = await fetchRoleDeletionImpact(roleId);
      setImpact(preview.impact);
      setBlocker(preview.blocker);
      setError(preview.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setLoadingImpact(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={beginDeleteConfirm}
        disabled={confirmOpen && loadingImpact}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-transparent px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        data-testid="role-delete-trigger"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Endgültig löschen
      </button>

      {confirmOpen ? (
        <RoleDeleteInlineConfirm
          roleId={roleId}
          roleName={roleName}
          roleKey={roleKey}
          impact={impact}
          blocker={blocker}
          impactLoading={loadingImpact}
          loadError={error}
          onCancel={() => {
            setConfirmOpen(false);
            setImpact(null);
            setBlocker(null);
            setError(null);
          }}
        />
      ) : null}
    </>
  );
}