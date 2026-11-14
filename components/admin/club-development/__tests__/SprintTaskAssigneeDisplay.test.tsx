/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SprintTaskAssigneeDisplay from "../SprintTaskAssigneeDisplay";

describe("SprintTaskAssigneeDisplay", () => {
  it("shows Nicht zugewiesen when empty", () => {
    render(<SprintTaskAssigneeDisplay assignees={[]} />);
    expect(screen.getByText("Verantwortlich")).toBeInTheDocument();
    expect(screen.getByText("Nicht zugewiesen")).toBeInTheDocument();
  });

  it("lists every assignee name", () => {
    render(
      <SprintTaskAssigneeDisplay
        assignees={[
          { userId: "u1", displayName: "Ada Lovelace", imageUrl: null },
          { userId: "u2", displayName: "Grace Hopper", imageUrl: "https://example.test/avatar.jpg" },
        ]}
      />,
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });
});