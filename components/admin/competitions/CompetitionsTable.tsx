"use client";

/**
 * CompetitionsTable — canonical SCE dense data table (DS-10 R1).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Edit2 } from "lucide-react";
import { ArchiveSceIcon, CompetitionSceIcon } from "@/components/icons/domain-sce-icon-components";
import type { CompetitionListItem } from "@/lib/competitions/dto";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { Badge } from "@/components/ui/Badge";
import { SceIconButton } from "@/components/sce/actions/SceIconButton";
import {
  SceDataTable,
  SceDataTableBody,
  SceDataTableCell,
  SceDataTableHead,
  SceDataTableHeaderCell,
  SceDataTableRow,
  SceEntityIdentity,
} from "@/components/sce/dense";
import { SCE_DENSE_META_TEXT_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";
import { cn } from "@/lib/cn";
import CompetitionEditDialog from "./CompetitionEditDialog";
import CompetitionDeleteButton from "./CompetitionDeleteButton";

const COMPETITION_TYPE_LABELS: Record<string, string> = {
  LEAGUE: "Liga",
  CUP: "Cup",
  TOURNAMENT_SERIES: "Turnierserie",
  OTHER: "Sonstige",
};

const GENDER_LABELS: Record<string, string> = {
  MALE: "Herren",
  FEMALE: "Frauen",
  MIXED: "Mixed",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Props = {
  competitions: CompetitionListItem[];
  canManage?: boolean;
  canDelete?: boolean;
};

export default function CompetitionsTable({ competitions, canManage = false, canDelete = false }: Props) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<CompetitionListItem | null>(null);

  async function handleArchive(id: string) {
    setActionLoading(id);
    try {
      await fetch(`/api/competitions/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRestore(id: string) {
    setActionLoading(id);
    try {
      await fetch(`/api/competitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  if (competitions.length === 0) {
    return null;
  }

  return (
    <>
      {editTarget ? (
        <CompetitionEditDialog competition={editTarget} open onClose={() => setEditTarget(null)} />
      ) : null}

      <SceDataTable aria-label="Wettkämpfe" data-testid="competitions-table">
        <SceDataTableHead>
          <tr>
            <SceDataTableHeaderCell>Wettkampf</SceDataTableHeaderCell>
            <SceDataTableHeaderCell>Saison</SceDataTableHeaderCell>
            <SceDataTableHeaderCell>Provider</SceDataTableHeaderCell>
            <SceDataTableHeaderCell>Gruppe</SceDataTableHeaderCell>
            <SceDataTableHeaderCell>Zugeordnete Teams</SceDataTableHeaderCell>
            <SceDataTableHeaderCell>Letzte Synchronisation</SceDataTableHeaderCell>
            <SceDataTableHeaderCell>Status</SceDataTableHeaderCell>
            {canManage ? (
              <SceDataTableHeaderCell align="right">
                <span className="sr-only">Aktionen</span>
              </SceDataTableHeaderCell>
            ) : null}
          </tr>
        </SceDataTableHead>
        <SceDataTableBody>
          {competitions.map((competition) => (
            <SceDataTableRow
              key={competition.id}
              className={cn("group", competition.isArchived && "opacity-60")}
            >
              <SceDataTableCell>
                <div className="flex items-start gap-2">
                  <CompetitionSceIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                  <div className="min-w-0">
                    <SceEntityIdentity
                      primary={competition.shortName ?? competition.officialName}
                      secondary={
                        competition.shortName ? competition.officialName : undefined
                      }
                      className="gap-0"
                    />
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge size="sm">
                        {COMPETITION_TYPE_LABELS[competition.competitionType] ??
                          competition.competitionType}
                      </Badge>
                      {competition.gender ? (
                        <Badge size="sm">
                          {GENDER_LABELS[competition.gender] ?? competition.gender}
                        </Badge>
                      ) : null}
                      {competition.ageCategory ? (
                        <Badge size="sm">{competition.ageCategory}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SceDataTableCell>
              <SceDataTableCell className={SCE_DENSE_META_TEXT_CLASS}>
                {competition.externalSeasonId ?? "—"}
              </SceDataTableCell>
              <SceDataTableCell>
                <Badge size="sm">{competition.provider}</Badge>
              </SceDataTableCell>
              <SceDataTableCell className={SCE_DENSE_META_TEXT_CLASS}>
                {competition.groupName ?? "—"}
              </SceDataTableCell>
              <SceDataTableCell className={SCE_DENSE_META_TEXT_CLASS}>
                {competition.assignedTeamCount > 0
                  ? `${competition.assignedTeamCount} Team${competition.assignedTeamCount !== 1 ? "s" : ""}`
                  : "Keine"}
              </SceDataTableCell>
              <SceDataTableCell className={SCE_DENSE_META_TEXT_CLASS}>
                {formatDate(competition.lastSyncedAt)}
              </SceDataTableCell>
              <SceDataTableCell>
                {competition.isArchived ? (
                  <AdminStatusPill label="Archiviert" tone="muted" />
                ) : (
                  <AdminStatusPill label="Aktiv" tone="success" />
                )}
              </SceDataTableCell>
              {canManage ? (
                <SceDataTableCell align="right">
                  <div className="flex items-center justify-end gap-0.5" data-sce-row-action="true">
                    <SceIconButton
                      title="Bearbeiten"
                      aria-label="Bearbeiten"
                      onClick={() => setEditTarget(competition)}
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 className="h-3.5 w-3.5" />}
                    />
                    {competition.isArchived ? (
                      <>
                        <SceIconButton
                          title="Wiederherstellen"
                          aria-label="Wiederherstellen"
                          disabled={actionLoading === competition.id}
                          onClick={() => handleRestore(competition.id)}
                          variant="ghost"
                          size="sm"
                          icon={<RotateCcw className="h-3.5 w-3.5" />}
                        />
                        {canDelete ? (
                          <CompetitionDeleteButton
                            competitionId={competition.id}
                            competitionName={competition.officialName}
                          />
                        ) : null}
                      </>
                    ) : (
                      <SceIconButton
                        title="Archivieren"
                        aria-label="Archivieren"
                        disabled={actionLoading === competition.id}
                        onClick={() => handleArchive(competition.id)}
                        variant="ghost"
                        size="sm"
                        icon={<ArchiveSceIcon className="h-3.5 w-3.5" />}
                      />
                    )}
                  </div>
                </SceDataTableCell>
              ) : null}
            </SceDataTableRow>
          ))}
        </SceDataTableBody>
      </SceDataTable>
    </>
  );
}
