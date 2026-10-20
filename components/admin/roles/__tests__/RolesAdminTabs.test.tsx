/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePathname } from "next/navigation";
import RolesAdminTabs from "../RolesAdminTabs";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard/administration/roles"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ push })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RolesAdminTabs — SceContextTabs", () => {
  it("uses route hrefs for deep links", () => {
    render(<RolesAdminTabs />);
    expect(screen.getByTestId("roles-admin-tabs-assignments")).toHaveAttribute(
      "href",
      "/dashboard/administration/roles/assignments",
    );
  });

  it("marks roles tab active on role detail sub-routes", () => {
    vi.mocked(usePathname).mockReturnValue(
      "/dashboard/administration/roles/role-id-1",
    );
    render(<RolesAdminTabs />);
    expect(screen.getByTestId("roles-admin-tabs-roles")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
