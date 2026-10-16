/**
 * @vitest-environment jsdom
 *
 * SCE-ACTIVITY-CREATE-01J-R5.3 — contextual workflow CTAs must not render via Navbar injection.
 */

import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AdminPageActions from "@/components/admin/layout/AdminPageActions";

describe("AdminPageActions", () => {
  it("does not render contextual workflow quick actions (Navbar boundary blocked)", () => {
    const { container } = render(<AdminPageActions />);
    expect(container).toBeEmptyDOMElement();
  });
});
