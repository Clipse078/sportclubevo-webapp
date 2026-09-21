/**
 * @vitest-environment jsdom
 * AUFGABEN-06F2-UX1 — TaskDescriptionEditor (U4).
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskDescriptionEditor from "../TaskDescriptionEditor";
import { emptyTaskDescriptionDocument } from "@/lib/tasks/task-description";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("TaskDescriptionEditor", () => {
  it("U4 description editor renders with toolbar", () => {
    const onChange = vi.fn();
    render(<TaskDescriptionEditor value={emptyTaskDescriptionDocument()} onChange={onChange} />);
    expect(screen.getByTestId("task-description-editor")).toBeInTheDocument();
    expect(screen.getByTestId("task-description-editor-toolbar")).toBeInTheDocument();
    expect(screen.getByTitle("Fett (Strg+B)")).toBeInTheDocument();
    expect(screen.getByTitle("Link (Strg+K)")).toBeInTheDocument();
    expect(screen.getByTitle("Checkliste")).toBeInTheDocument();
  });
});
