/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

describe("DS2-07G — SceWorkspaceChrome landmark", () => {
  it("exposes workspace chrome test id and a main landmark for functional probes", () => {
    render(
      <SceWorkspaceChrome header={{ title: "Probe workspace" }}>
        <p>Content</p>
      </SceWorkspaceChrome>,
    );
    expect(screen.getByTestId("sce-workspace-chrome")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("data-sce-page-shell");
  });
});
