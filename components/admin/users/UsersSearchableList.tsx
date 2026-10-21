"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserX } from "lucide-react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import {
  SceDenseList,
  SceDenseListRow,
  SceDenseResultCount,
  SceDenseSurface,
  SceDenseToolbar,
  SceEntityIdentity,
} from "@/components/sce/dense";
import { SceSearchField } from "@/components/sce/forms/SceSearchField";
import { SCE_KPI_CARD_SURFACE } from "@/lib/shell/sce-surface-system";
import { cn } from "@/lib/cn";

type UserItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: string[];
};

type UsersSearchableListProps = {
  currentUserId: string;
  initialUsers: UserItem[];
};

function getRoleBadgeClass(roleName: string): string {
  const n = roleName.toLowerCase();
  if (n.includes("superadmin")) return "sce-role-badge sce-role-badge-admin";
  if (n.includes("admin")) return "sce-role-badge sce-role-badge-admin";
  if (n.includes("trainer")) return "sce-role-badge sce-role-badge-trainer";
  if (n.includes("staff")) return "sce-role-badge sce-role-badge-staff";
  return "sce-role-badge sce-role-badge-member";
}

export default function UsersSearchableList({
  currentUserId,
  initialUsers,
}: UsersSearchableListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialUsers;
    return initialUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q)),
    );
  }, [initialUsers, query]);

  const activeCount = initialUsers.filter((u) => u.isActive).length;
  const withRolesCount = initialUsers.filter((u) => u.roles.length > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={cn(SCE_KPI_CARD_SURFACE, "p-4")}>
          <p className="sce-data-label">Benutzer</p>
          <p
            className="mt-1.5 text-2xl font-bold text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {initialUsers.length}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Total</p>
        </div>
        <div className={cn(SCE_KPI_CARD_SURFACE, "p-4")}>
          <p className="sce-data-label">Aktiv</p>
          <p
            className="mt-1.5 text-2xl font-bold text-emerald-600"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">aktive Konten</p>
        </div>
        <div className={cn(SCE_KPI_CARD_SURFACE, "p-4")}>
          <p className="sce-data-label">Mit Rollen</p>
          <p
            className="mt-1.5 text-2xl font-bold text-[var(--blue)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {withRolesCount}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">mit Zuweisung</p>
        </div>
      </div>

      <SceDenseSurface>
        <SceDenseToolbar>
          <SceSearchField
            value={query}
            onChange={setQuery}
            placeholder="Benutzer suchen nach Name, E-Mail oder Rolle…"
            aria-label="Benutzer suchen"
            className="min-w-0 flex-1"
          />
        </SceDenseToolbar>

        {query.trim() ? (
          <SceDenseResultCount
            shown={filtered.length}
            total={initialUsers.length}
            label="Benutzer"
          />
        ) : null}

        {initialUsers.length === 0 ? (
          <SceEmptyState
            variant="NO_DATA"
            icon={<UserX className="h-10 w-10" />}
            title="Noch keine Benutzer"
            description="Noch keine Benutzerkonten erfasst. Über die Schaltfläche oben rechts den ersten anlegen."
          />
        ) : filtered.length === 0 ? (
          <SceEmptyState
            variant="FILTERED_NO_RESULTS"
            title="Keine Treffer"
            description={`Für „${query}" wurden keine Benutzer gefunden.`}
          />
        ) : (
          <SceDenseList aria-label="Plattform-Benutzer">
            {filtered.map((user) => {
              const isCurrentUser = user.id === currentUserId;

              return (
                <SceDenseListRow key={user.id} interactive>
                  <Link
                    href={`/dashboard/users/${user.id}`}
                    className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <SceEntityIdentity
                      leading={<AdminAvatar name={user.name} size="sm" />}
                      primary={user.name}
                      secondary={user.email}
                      badges={
                        <span className="flex flex-wrap items-center gap-1.5">
                          {isCurrentUser ? (
                            <span className="inline-flex h-5 items-center rounded-full border border-amber-200 bg-amber-50 px-2 text-[0.65rem] font-semibold text-amber-700">
                              Ich
                            </span>
                          ) : null}
                          {user.roles.map((role) => (
                            <span key={role} className={getRoleBadgeClass(role)}>
                              {role}
                            </span>
                          ))}
                          {user.roles.length === 0 ? (
                            <span className="sce-role-badge sce-role-badge-member opacity-50">
                              Keine Rolle
                            </span>
                          ) : null}
                        </span>
                      }
                    />
                    <AdminStatusPill
                      label={user.isActive ? "Aktiv" : "Inaktiv"}
                      tone={user.isActive ? "success" : "muted"}
                    />
                  </Link>
                </SceDenseListRow>
              );
            })}
          </SceDenseList>
        )}
      </SceDenseSurface>
    </div>
  );
}
