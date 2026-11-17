import type { RoleDeletionBlocker, RoleDeletionImpact } from "@/lib/roles/role-delete-service";

export function buildRoleDeletionConfirmDescription(
  roleName: string,
  roleKey: string,
  impact: RoleDeletionImpact | null,
): string {
  const lines: string[] = [
    `Die Rolle „${roleName}" (${roleKey}) wird dauerhaft und unwiderruflich entfernt.`,
    "Diese Aktion kann nicht rückgängig gemacht werden.",
  ];

  if (impact) {
    const detail: string[] = [];
    if (impact.permissionCount > 0) {
      detail.push(
        `${impact.permissionCount} Berechtigungs-Zuweisung${impact.permissionCount !== 1 ? "en" : ""}`,
      );
    }
    if (impact.workflowRuleCount > 0) {
      detail.push(
        `${impact.workflowRuleCount} Workflow-Regel${impact.workflowRuleCount !== 1 ? "n" : ""}`,
      );
    }
    if (impact.totalUserRoleCount > 0) {
      detail.push(
        `${impact.totalUserRoleCount} Rollenzuweisung${impact.totalUserRoleCount !== 1 ? "en" : ""}`,
      );
    }
    if (detail.length > 0) {
      lines.push(`Wird gelöscht: ${detail.join("; ")}.`);
    }
    if (impact.activeUserCount > 0) {
      lines.push(
        `${impact.activeUserCount} aktive${impact.activeUserCount !== 1 ? " Benutzer haben" : "r Benutzer hat"} diese Rolle — weise vor dem Löschen eine andere Rolle zu.`,
      );
    }
  }

  return lines.join(" ");
}

export function formatRoleDeletionBlockerMessage(blocker: RoleDeletionBlocker): string {
  return blocker.message;
}