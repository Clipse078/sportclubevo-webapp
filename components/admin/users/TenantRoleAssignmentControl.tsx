"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Shield } from "lucide-react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";

type RoleOption = {
  id: string;
  name: string;
  isSystem: boolean;
};

type Props = {
  userId: string;
  availableRoles: RoleOption[];
  initialRoleIds: string[];
  canManage: boolean;
};

export default function TenantRoleAssignmentControl({
  userId,
  availableRoles,
  initialRoleIds,
  canManage,
}: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialRoleIds),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    selectedIds.size !== initialRoleIds.length ||
    initialRoleIds.some((id) => !selectedIds.has(id));

  function toggle(roleId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
    setError(null);
  }

  function save() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${userId}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleIds: Array.from(selectedIds) }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Ein Fehler ist aufgetreten.");
          return;
        }
        router.refresh();
      } catch {
        setError("Netzwerkfehler. Bitte versuche es erneut.");
      }
    });
  }

  if (availableRoles.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Keine Rollen für diesen Club definiert.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {availableRoles.map((role) => {
          const checked = selectedIds.has(role.id);
          const switchId = `role-switch-${role.id}`;
          return (
            <li
              key={role.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/70 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {role.isSystem ? (
                  <ProductDomainSceIcon
                    name="roles-access"
                    size={12}
                    className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]"
                  />
                ) : (
                  <Shield className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
                )}
                <label htmlFor={canManage ? switchId : undefined} className="text-sm font-medium text-[var(--foreground)]">
                  {role.name}
                </label>
              </div>
              {canManage ? (
                <SwitchThumb
                  id={switchId}
                  checked={checked}
                  disabled={isPending}
                  onChange={(next) => toggle(role.id, next)}
                  aria-label={`${role.name} ${checked ? "deaktivieren" : "aktivieren"}`}
                />
              ) : (
                <span
                  role="img"
                  aria-label={checked ? "Aktiv" : "Inaktiv"}
                  className={`text-xs font-semibold ${checked ? "text-[var(--sce-primary)]" : "text-[var(--muted)]"}`}
                >
                  {checked ? "Aktiv" : "Inaktiv"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {canManage ? (
        <button
          type="button"
          onClick={save}
          disabled={!isDirty || isPending}
          className="fca-button-primary inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Speichern…" : "Änderungen speichern"}
        </button>
      ) : null}
    </div>
  );
}
