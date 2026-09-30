"use client";

import ImpersonateButton from "@/components/admin/users/ImpersonateButton";
import InvitePersonControl from "@/components/admin/users/InvitePersonControl";
import MembershipAccessControl from "@/components/admin/users/MembershipAccessControl";
import type { PersonAccessStatus } from "@/lib/admin/users/person-access-status";

type Props = {
  userId: string;
  userName: string;
  userEmail: string;
  membershipIsActive: boolean;
  userIsActive: boolean;
  pendingInvitation: boolean;
  canManage: boolean;
  canInvite: boolean;
  canImpersonate: boolean;
  isSelf: boolean;
  linkedPersonName?: string | null;
  tenantRoleNames: string[];
  accessStatus: PersonAccessStatus;
};

export default function PersonAdminActionsPanel({
  userId,
  userName,
  userEmail,
  membershipIsActive,
  userIsActive,
  pendingInvitation,
  canManage,
  canInvite,
  canImpersonate,
  isSelf,
  linkedPersonName,
  tenantRoleNames,
  accessStatus,
}: Props) {
  const showMembershipControl =
    canManage && !isSelf && !accessStatus.isPendingInvitation;

  return (
    <div className="space-y-5">
      {canImpersonate && !isSelf && accessStatus.isFullyActive ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/90 px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Vorschau
          </p>
          <p className="mt-1 text-xs text-[var(--text-2)] leading-relaxed">
            SportClubEvo exakt so ansehen, wie diese Person die Anwendung erlebt.
          </p>
          <div className="mt-3">
            <ImpersonateButton userId={userId} variant="person-detail" />
          </div>
        </div>
      ) : null}

      {(canInvite && pendingInvitation) || (canInvite && !userIsActive) ? (
        <div className="sce-detail-section !mb-0">
          <div className="sce-detail-section-header">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Einladung
            </p>
          </div>
          <div className="sce-detail-section-body">
            <InvitePersonControl
              userId={userId}
              canManage={canInvite}
              pendingInvitation={pendingInvitation}
            />
          </div>
        </div>
      ) : null}

      {showMembershipControl ? (
        <div className="sce-detail-section !mb-0">
          <div className="sce-detail-section-header">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Club-Zugriff
            </p>
          </div>
          <div className="sce-detail-section-body">
            <MembershipAccessControl
              userId={userId}
              userName={userName}
              userEmail={userEmail}
              membershipIsActive={membershipIsActive}
              userIsActive={userIsActive}
              pendingInvitation={false}
              canManage={canManage}
              isSelf={isSelf}
              linkedPersonName={linkedPersonName}
              tenantRoleNames={tenantRoleNames}
            />
          </div>
        </div>
      ) : null}

      {accessStatus.isPendingInvitation ? (
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Solange die Einladung aussteht, ist kein produktiver Club-Zugriff aktiv. Nach Annahme
          können Rollen und Zugriff wie gewohnt verwaltet werden.
        </p>
      ) : null}
    </div>
  );
}
