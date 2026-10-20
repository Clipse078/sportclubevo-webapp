/**
 * @vitest-environment jsdom
 *
 * DS-08 R1 — Roles overview Server/Client boundary regression (dense table rows).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TenantRolesOverviewDenseTable from "@/components/admin/roles/TenantRolesOverviewDenseTable";
import { SceDataTableRow } from "@/components/sce/dense";

const ROOT = resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-08 R1 — Roles overview RSC boundary", () => {
  it("keeps administration roles page as a Server Component entry", () => {
    const source = readSource("app/(admin)/dashboard/administration/roles/page.tsx");
    expect(source).not.toMatch(/^"use client"/m);
    expect(source).toContain("TenantRolesOverviewDenseTable");
  });

  it("locks interactive table row handlers in a Client Component module", () => {
    const rowModule = readSource("components/sce/dense/SceDataTableRow.tsx");
    expect(rowModule).toMatch(/^"use client"/m);
    expect(rowModule).toContain("onKeyDown");
    expect(rowModule).toContain("onClick");

    const tableShell = readSource("components/sce/dense/SceDataTable.tsx");
    expect(tableShell).not.toMatch(/^"use client"/m);
    expect(tableShell).not.toContain("onKeyDown");
    expect(tableShell).not.toContain("onClick");
  });

  it("does not pass row-level function props from Roles dense table (non-interactive rows)", () => {
    const source = readSource("components/admin/roles/TenantRolesOverviewDenseTable.tsx");
    expect(source).not.toMatch(/<SceDataTableRow[^>]*onClick=/);
    expect(source).toContain("data-sce-row-action");
  });

  it("renders Roles overview dense table without illegal row activation attributes", () => {
    render(
      <TenantRolesOverviewDenseTable
        roles={[
          {
            id: "role-1",
            name: "Vorstand",
            description: "Verwaltung",
            isSystem: false,
            isArchived: false,
            userCount: 2,
            permissionCount: 12,
            updatedAt: new Date("2026-01-15T12:00:00.000Z"),
          },
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Rollen" });
    const row = table.querySelector('[data-sce-data-table-row="true"]');
    expect(row).toBeTruthy();
    expect(row).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("link", { name: /Details/i })).toHaveAttribute(
      "href",
      "/dashboard/administration/roles/role-1",
    );
  });

  it("keeps legitimate row keyboard activation on the client row primitive", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <table>
        <tbody>
          <SceDataTableRow onClick={onRowClick}>
            <td>Row body</td>
            <td data-sce-row-action="true">
              <button type="button">Menu</button>
            </td>
          </SceDataTableRow>
        </tbody>
      </table>,
    );

    const row = screen.getByText("Row body").closest("tr")!;
    expect(row).toHaveAttribute("tabindex", "0");
    row.focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });
});

describe("SCE-DESIGN-SYSTEM-08 R1 — People & Access compatibility", () => {
  it("preserves client-owned dense grid row for People & Access", () => {
    const peopleRow = readSource("components/admin/users/PeopleAccessDenseUserRow.tsx");
    expect(peopleRow).toMatch(/^"use client"/m);
    expect(peopleRow).toContain("SceDenseGridRow");

    const peopleList = readSource("components/admin/users/TenantUsersSearchableList.tsx");
    expect(peopleList).toContain("PeopleAccessDenseUserRow");
    expect(peopleList).toContain('feedbackSurfaceId="people-access-list"');
  });
});
