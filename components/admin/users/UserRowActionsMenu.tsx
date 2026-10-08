"use client";

/**
 * ADMIN-HARD-DELETE — per-row ••• action menu for the tenant users list.
 *
 * Shown on User rows (never on Person-only rows).
 *
 * Club Admin actions (canManageMembership):
 *   - "Aus Verein entfernen"  → DELETE /api/admin/users/[userId]/membership
 *   - "Einladung widerrufen"  → DELETE /api/admin/users/[userId]/invite  (pending state only)
 *
 * Platform-only action (canGlobalDelete):
 *   - "Benutzer endgültig löschen" → navigates to /dashboard/users/[userId]
 *     (the platform detail page, where GlobalUserDeleteButton is already mounted)
 *
 * The two actions are deliberately kept separate and never combined.
 */

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  KeyRound,
  MoreHorizontal,
  Trash2,
  User,
  UserMinus,
  X,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { PopoverContent } from "@/components/ui/Popover";
import ImpersonateButton from "@/components/admin/users/ImpersonateButton";
import { cn } from "@/lib/cn";

type Props = {
  userId: string;
  userName: string;
  userEmail: string;
  /** True when there is an active (non-expired, non-used) invitation token. */
  pendingInvitation: boolean;
  /** Actor may manage memberships for this tenant (Club Admin or platform). */
  canManageMembership: boolean;
  /** Actor may permanently delete global user accounts (platform only). */
  canGlobalDelete: boolean;
  /** Prevent self-removal from offering the remove action. */
  isSelf: boolean;
  /** Real actor may start tenant impersonation for this target (server-derived). */
  canImpersonateTarget?: boolean;
  /** Show tenant admin shortcuts (not destructive). */
  canShowAdminShortcuts?: boolean;
  onEditAccess?: (userId: string) => void;
  linkedPersonName?: string | null;
  tenantRoleNames?: string[];
};

function MenuDivider() {
  return <div className="my-1 h-px bg-[var(--border)]/80" role="separator" />;
}

function RowMenuItem({
  icon,
  iconClassName,
  label,
  href,
  onSelect,
  destructive = false,
}: {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
}) {
  const className = cn(
    "flex w-full min-h-[38px] cursor-pointer items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0",
    destructive
      ? "text-[var(--sce-danger)] hover:bg-red-500/10 hover:text-[var(--sce-danger)]"
      : "text-[var(--foreground)] hover:bg-[var(--surface-2)]/90",
  );

  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center",
          iconClassName,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={onSelect}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onSelect}>
      {content}
    </button>
  );
}

export default function UserRowActionsMenu({
  userId,
  userName,
  userEmail,
  pendingInvitation,
  canManageMembership,
  canGlobalDelete,
  isSelf,
  canImpersonateTarget = false,
  canShowAdminShortcuts = false,
  onEditAccess,
  linkedPersonName,
  tenantRoleNames = [],
}: Props) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Tenant removal dialog state
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Revoke invitation state
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const canRemove = canManageMembership && !isSelf;
  const showImpersonate = canImpersonateTarget && !isSelf;
  const showAdminShortcuts = canShowAdminShortcuts && !isSelf;
  const hasNormalActions = showImpersonate || showAdminShortcuts;

  // If no actions are available, render nothing.
  if (!canRemove && !canGlobalDelete && !hasNormalActions) return null;

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleRemoveClick() {
    closeMenu();
    if (pendingInvitation) {
      setRevokeError(null);
      setShowRevokeDialog(true);
    } else {
      setRemoveError(null);
      setShowRemoveDialog(true);
    }
  }

  async function doRemoveMembership() {
    setRemoving(true);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/membership`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setRemoveError(data.error ?? "Zugriff konnte nicht entfernt werden.");
        return;
      }
      setShowRemoveDialog(false);
      router.push("/dashboard/admin/users");
      router.refresh();
    } catch {
      setRemoveError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setRemoving(false);
    }
  }

  async function doRevokeInvitation() {
    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/invite`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setRevokeError(data.error ?? "Einladung konnte nicht widerrufen werden.");
        return;
      }
      setShowRevokeDialog(false);
      router.refresh();
    } catch {
      setRevokeError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setRevoking(false);
    }
  }

  const hasDestructiveSection = canRemove || canGlobalDelete;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Mehr Aktionen"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen((value) => !value);
        }}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--text-2)] transition-colors",
          "hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      <PopoverContent
        open={menuOpen}
        onOpenChange={setMenuOpen}
        anchorRef={triggerRef}
        placement="bottom-end"
        matchAnchorWidth={false}
        constrainHeight={false}
        clipOverflow={false}
        role="dialog"
        className="w-[min(100vw-2rem,14.5rem)] p-1.5"
      >
        <div role="menu" aria-label="Benutzeraktionen">
          {showImpersonate ? (
            <div onClick={(event) => event.stopPropagation()}>
              <ImpersonateButton
                userId={userId}
                variant="row-menu"
                onActivate={closeMenu}
              />
            </div>
          ) : null}

          {showAdminShortcuts ? (
            <>
              {onEditAccess ? (
                <RowMenuItem
                  icon={<KeyRound className="h-4 w-4" />}
                  iconClassName="text-[var(--sce-primary)]"
                  label="Zugriff bearbeiten"
                  onSelect={() => {
                    closeMenu();
                    onEditAccess(userId);
                  }}
                />
              ) : null}
              <RowMenuItem
                icon={<User className="h-4 w-4" />}
                iconClassName="text-[var(--blue-mid)]"
                label="Detailseite"
                href={`/dashboard/admin/users/${userId}`}
                onSelect={closeMenu}
              />
            </>
          ) : null}

          {hasNormalActions && hasDestructiveSection ? <MenuDivider /> : null}

          {canRemove ? (
            <RowMenuItem
              icon={
                pendingInvitation ? (
                  <X className="h-4 w-4" />
                ) : (
                  <UserMinus className="h-4 w-4" />
                )
              }
              iconClassName="text-[var(--sce-danger)]"
              label={pendingInvitation ? "Einladung widerrufen" : "Aus Verein entfernen"}
              onSelect={handleRemoveClick}
              destructive
            />
          ) : null}

          {canGlobalDelete ? (
            <>
              {canRemove ? <MenuDivider /> : null}
              <RowMenuItem
                icon={<Trash2 className="h-4 w-4" />}
                iconClassName="text-[var(--sce-danger)]"
                label="Benutzer endgültig löschen"
                href={`/dashboard/users/${userId}`}
                onSelect={closeMenu}
                destructive
              />
            </>
          ) : null}
        </div>
      </PopoverContent>

      {/* Tenant membership removal confirmation dialog */}
      <Dialog
        open={showRemoveDialog}
        onClose={() => !removing && setShowRemoveDialog(false)}
        title="Aus Verein entfernen"
        description={`„${userName}" (${userEmail}) dauerhaft aus diesem Club entfernen.`}
        footer={
          <div className="flex flex-col gap-2">
            {removeError ? (
              <p className="text-sm text-red-600">{removeError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowRemoveDialog(false)}
                disabled={removing}
              >
                Abbrechen
              </Button>
              <Button variant="danger" onClick={doRemoveMembership} loading={removing}>
                Aus Verein entfernen
              </Button>
            </div>
          </div>
        }
      >
        <RemovalImpactContent
          userName={userName}
          userEmail={userEmail}
          linkedPersonName={linkedPersonName}
          tenantRoleNames={tenantRoleNames}
        />
      </Dialog>

      {/* Invitation revoke confirmation dialog */}
      <Dialog
        open={showRevokeDialog}
        onClose={() => !revoking && setShowRevokeDialog(false)}
        title="Einladung widerrufen"
        description={`Ausstehende Einladung für „${userName}" (${userEmail}) widerrufen.`}
        footer={
          <div className="flex flex-col gap-2">
            {revokeError ? (
              <p className="text-sm text-red-600">{revokeError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowRevokeDialog(false)}
                disabled={revoking}
              >
                Abbrechen
              </Button>
              <Button variant="danger" onClick={doRevokeInvitation} loading={revoking}>
                Einladung widerrufen
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-[var(--text-2)]">
          <p>
            Der ausstehende Einladungslink wird ungültig. Der Benutzer kann sich mit diesem
            Link nicht mehr im Club registrieren.
          </p>
          <p>
            Das globale Benutzerkonto (falls bereits vorhanden) und etwaige Mitgliedschaften
            in anderen Clubs bleiben unberührt.
          </p>
        </div>
      </Dialog>
    </>
  );
}

// ── Shared removal impact list ──────────────────────────────────────────────

function RemovalImpactContent({
  userName,
  userEmail,
  linkedPersonName,
  tenantRoleNames,
}: {
  userName: string;
  userEmail: string;
  linkedPersonName?: string | null;
  tenantRoleNames: string[];
}) {
  return (
    <div className="space-y-4 text-sm text-[var(--text-2)]">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="font-medium text-red-800">
            Diese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 font-medium text-[var(--foreground)]">Wird entfernt:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Zugriff auf diesen Club für &bdquo;{userName}&ldquo;</li>
          {tenantRoleNames.length > 0 && (
            <li>
              {tenantRoleNames.length} Rollen-Zuweisung
              {tenantRoleNames.length !== 1 ? "en" : ""} ({tenantRoleNames.join(", ")})
            </li>
          )}
        </ul>
      </div>

      <div>
        <p className="mb-2 font-medium text-[var(--foreground)]">Bleibt erhalten:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-[var(--muted)]" />
            Globales Benutzerkonto ({userEmail}) — Authentifizierungsdaten bleiben unverändert
          </li>
          {linkedPersonName ? (
            <li>Personendatensatz &bdquo;{linkedPersonName}&ldquo; bleibt im System</li>
          ) : null}
          <li>Mitgliedschaften in anderen Clubs sind nicht betroffen</li>
        </ul>
      </div>
    </div>
  );
}
