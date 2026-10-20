import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ArrowRight, KeyRound } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import ProtectedRoleBadge from "@/components/admin/roles/ProtectedRoleBadge";
import RoleScopeBadge from "@/components/admin/roles/RoleScopeBadge";
import {
  SceDataTable,
  SceDataTableBody,
  SceDataTableCell,
  SceDataTableHead,
  SceDataTableHeaderCell,
  SceDataTableRow,
  SceDenseList,
  SceDenseListRow,
  SceDenseSurface,
  SceEntityIdentity,
} from "@/components/sce/dense";
import { SceActionLink } from "@/components/sce/actions/SceActionLink";
import { SCE_DENSE_META_TEXT_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";

export type TenantRoleOverviewRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isArchived: boolean;
  userCount: number;
  permissionCount: number;
  updatedAt: Date;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

type Props = {
  roles: TenantRoleOverviewRow[];
};

export default function TenantRolesOverviewDenseTable({ roles }: Props) {
  return (
    <SceDenseSurface feedbackSurfaceId="roles-overview-list" aria-label="Rollenliste" data-testid="roles-dense-surface">
      <div className="hidden md:block">
        <SceDataTable aria-label="Rollen">
          <SceDataTableHead>
            <tr>
              <SceDataTableHeaderCell>Rolle</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Scope</SceDataTableHeaderCell>
              <SceDataTableHeaderCell align="right">Benutzer</SceDataTableHeaderCell>
              <SceDataTableHeaderCell align="right">Berechtigungen</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Status</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Zuletzt geändert</SceDataTableHeaderCell>
              <SceDataTableHeaderCell align="right">
                <span className="sr-only">Aktionen</span>
              </SceDataTableHeaderCell>
            </tr>
          </SceDataTableHead>
          <SceDataTableBody>
            {roles.map((role) => (
              <SceDataTableRow key={role.id} className="group">
                <SceDataTableCell>
                  <SceEntityIdentity
                    primary={role.name}
                    secondary={role.description ?? undefined}
                    className="gap-0"
                  />
                </SceDataTableCell>
                <SceDataTableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <RoleScopeBadge scope="TENANT" />
                    {role.isSystem ? <ProtectedRoleBadge /> : null}
                  </div>
                </SceDataTableCell>
                <SceDataTableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <ProductDomainSceIcon name="people" size={12} className="h-3.5 w-3.5 text-[var(--muted)]" />
                    <span className="font-semibold tabular-nums">{role.userCount}</span>
                  </div>
                </SceDataTableCell>
                <SceDataTableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                    <span className="font-semibold tabular-nums">{role.permissionCount}</span>
                  </div>
                </SceDataTableCell>
                <SceDataTableCell>
                  {role.isArchived ? (
                    <AdminStatusPill label="Archiviert" tone="muted" />
                  ) : (
                    <AdminStatusPill label="Aktiv" tone="success" />
                  )}
                </SceDataTableCell>
                <SceDataTableCell className={SCE_DENSE_META_TEXT_CLASS}>{formatDate(role.updatedAt)}</SceDataTableCell>
                <SceDataTableCell align="right">
                  <SceActionLink
                    href={`/dashboard/administration/roles/${role.id}`}
                    variant="link"
                    size="sm"
                    data-sce-action-hierarchy="TERTIARY_TEXT"
                    className="inline-flex h-auto min-h-0 items-center gap-1 px-0 py-0 text-[0.78rem] opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    Details
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </SceActionLink>
                </SceDataTableCell>
              </SceDataTableRow>
            ))}
          </SceDataTableBody>
        </SceDataTable>
      </div>

      <SceDenseList aria-label="Rollen (Mobile)" className="md:hidden">
        {roles.map((role) => (
          <SceDenseListRow key={role.id} interactive className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/dashboard/administration/roles/${role.id}`}
                className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]/40"
              >
                <SceEntityIdentity primary={role.name} secondary={role.description ?? undefined} />
              </Link>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <RoleScopeBadge scope="TENANT" />
              {role.isSystem ? <ProtectedRoleBadge /> : null}
              {role.isArchived ? (
                <AdminStatusPill label="Archiviert" tone="muted" />
              ) : (
                <AdminStatusPill label="Aktiv" tone="success" />
              )}
            </div>
            <div className={`flex flex-wrap items-center gap-3 ${SCE_DENSE_META_TEXT_CLASS}`}>
              <span className="flex items-center gap-1">
                <ProductDomainSceIcon name="people" size={12} className="h-3.5 w-3.5 text-[var(--muted)]" />
                <strong className="font-semibold text-[var(--foreground)]">{role.userCount}</strong> Benutzer
              </span>
              <span className="flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                <strong className="font-semibold text-[var(--foreground)]">{role.permissionCount}</strong> Rechte
              </span>
            </div>
          </SceDenseListRow>
        ))}
      </SceDenseList>
    </SceDenseSurface>
  );
}
