/**
 * People & Access — Vereinsentwicklung module presentation aligned with SCE club nav.
 */

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export type VereinsentwicklungAccessRow = {
  navLabel: string;
  state: "inherit" | "allow" | "deny" | "partial";
  detail: string;
  permissionKeys: readonly PermissionKey[];
};

const VL_MODULE_ROWS: ReadonlyArray<{
  navLabel: string;
  view: PermissionKey;
  manage?: PermissionKey;
}> = [
  { navLabel: "Übersicht", view: PERMISSIONS.TARGETS_VIEW, manage: PERMISSIONS.TARGETS_MANAGE },
  { navLabel: "Strategie & Ziele", view: PERMISSIONS.TARGETS_VIEW, manage: PERMISSIONS.TARGETS_MANAGE },
  {
    navLabel: "Vorhaben & Umsetzung",
    view: PERMISSIONS.INITIATIVES_VIEW,
    manage: PERMISSIONS.INITIATIVES_MANAGE,
  },
  { navLabel: "Sitzungen", view: PERMISSIONS.MEETINGS_VIEW, manage: PERMISSIONS.MEETINGS_MANAGE },
];

export function buildVereinsentwicklungAccessRows(
  effectiveKeys: ReadonlySet<string>,
): VereinsentwicklungAccessRow[] {
  return VL_MODULE_ROWS.map(({ navLabel, view, manage }) => {
    const keys = manage ? ([view, manage] as const) : ([view] as const);
    const hasView = effectiveKeys.has(view);
    const hasManage = manage ? effectiveKeys.has(manage) : false;
    let state: VereinsentwicklungAccessRow["state"] = "deny";
    let detail = "Kein Zugriff";

    if (hasManage) {
      state = "allow";
      detail = manage ? "Bearbeiten" : "Ansehen";
    } else if (hasView) {
      state = "partial";
      detail = "Ansehen";
    }

    return {
      navLabel,
      state,
      detail,
      permissionKeys: keys,
    };
  });
}