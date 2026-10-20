/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  SceDataTable,
  SceDataTableBody,
  SceDataTableCell,
  SceDataTableHead,
  SceDataTableHeaderCell,
  SceDataTableRow,
  SceDenseGridCell,
  SceDenseGridHeader,
  SceDenseGridHeaderCell,
  SceDenseGridRow,
  SceDenseSurface,
  SceEntityIdentity,
  SceSortableColumnHeader,
} from "@/components/sce/dense";
import { SCE_PEOPLE_ACCESS_DENSE_GRID } from "@/lib/design-system/sce-dense-ui-foundation";

describe("SceDensePrimitives", () => {
  it("renders dense surface with feedback surface id", () => {
    render(
      <SceDenseSurface feedbackSurfaceId="test-list" aria-label="Test">
        <p>Content</p>
      </SceDenseSurface>,
    );
    const surface = screen.getByTestId("sce-dense-surface");
    expect(surface).toHaveAttribute("data-sce-feedback-surface", "test-list");
    expect(surface).toHaveAttribute("data-sce-dense-surface", "true");
  });

  it("renders semantic data table structure", () => {
    render(
      <SceDataTable aria-label="Demo">
        <SceDataTableHead>
          <tr>
            <SceDataTableHeaderCell>Name</SceDataTableHeaderCell>
          </tr>
        </SceDataTableHead>
        <SceDataTableBody>
          <SceDataTableRow>
            <SceDataTableCell>Ada</SceDataTableCell>
          </SceDataTableRow>
        </SceDataTableBody>
      </SceDataTable>,
    );
    expect(screen.getByRole("table", { name: "Demo" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    const row = screen.getByText("Ada").closest("tr");
    expect(row).not.toHaveAttribute("tabindex");
  });

  it("activates data table row on Enter but not when focus is on row action", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SceDataTable aria-label="Interactive">
        <SceDataTableBody>
          <SceDataTableRow onClick={onClick}>
            <SceDataTableCell>Row</SceDataTableCell>
            <SceDataTableCell>
              <div data-sce-row-action="true">
                <button type="button">Act</button>
              </div>
            </SceDataTableCell>
          </SceDataTableRow>
        </SceDataTableBody>
      </SceDataTable>,
    );
    const row = screen.getByText("Row").closest("tr")!;
    row.focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Act" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates grid row on Enter but not when focus is on row action", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <SceDenseGridRow
        gridClassName={SCE_PEOPLE_ACCESS_DENSE_GRID}
        onActivate={onActivate}
        activateLabel="Open"
        data-testid="row"
      >
        <SceDenseGridCell>Identity</SceDenseGridCell>
        <div data-sce-row-action="true">
          <button type="button">Menu</button>
        </div>
      </SceDenseGridRow>,
    );
    const row = screen.getByTestId("row");
    row.focus();
    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("exposes accessible sort state on sortable header", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<SceSortableColumnHeader label="Name" sortDirection={false} onSort={onSort} />);
    const btn = screen.getByRole("button", { name: "Sortieren nach Name" });
    expect(btn).toHaveAttribute("aria-sort", "none");
    await user.click(btn);
    expect(onSort).toHaveBeenCalled();
  });

  it("renders entity identity hierarchy", () => {
    render(
      <SceEntityIdentity
        primary="Alex Muster"
        secondary="alex@example.com"
        badges={<span data-testid="badge">Ich</span>}
      />,
    );
    expect(screen.getByText("Alex Muster")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toBeInTheDocument();
  });

  it("renders grid header with column headers", () => {
    render(
      <SceDenseGridHeader gridClassName={SCE_PEOPLE_ACCESS_DENSE_GRID}>
        <SceDenseGridHeaderCell>Person</SceDenseGridHeaderCell>
        <SceDenseGridHeaderCell>Status</SceDenseGridHeaderCell>
      </SceDenseGridHeader>,
    );
    expect(screen.getByRole("columnheader", { name: "Person" })).toBeInTheDocument();
  });
});
