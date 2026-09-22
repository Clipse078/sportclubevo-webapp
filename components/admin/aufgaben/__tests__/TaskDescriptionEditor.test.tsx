/**
 * @vitest-environment jsdom
 * AUFGABEN-06F2-UX1 — TaskDescriptionEditor (U4).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskDescriptionEditor from "../TaskDescriptionEditor";
import { emptyTaskDescriptionDocument } from "@/lib/tasks/task-description";
import type { TaskDescriptionDocument } from "@/lib/tasks/task-description";

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

  it("A43–A51 toolbar toggles update document JSON", async () => {
    const user = userEvent.setup();
    const seed: TaskDescriptionDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    };
    let latest: TaskDescriptionDocument = seed;
    const onChange = vi.fn((doc: TaskDescriptionDocument) => {
      latest = doc;
    });

    render(<TaskDescriptionEditor value={seed} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId("task-description-editor-toolbar")).toBeVisible());

    const prose = screen.getByTestId("task-description-editor").querySelector(".ProseMirror") as HTMLElement;
    await user.click(prose);
    await user.tripleClick(prose);

    await user.click(screen.getByTitle("Fett (Strg+B)"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"bold"'));

    await user.click(screen.getByTitle("Kursiv (Strg+I)"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"italic"'));

    await user.click(screen.getByTitle("Unterstrichen"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"underline"'));

    await user.click(screen.getByTitle("Durchgestrichen"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"strike"'));

    await user.click(screen.getByTitle("Code"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"code"'));

    await user.click(screen.getByTitle("Aufzählung"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"bulletList"'));

    await user.click(screen.getByTitle("Nummerierte Liste"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"orderedList"'));

    await user.click(screen.getByTitle("Checkliste"));
    await waitFor(() => expect(JSON.stringify(latest)).toContain('"taskList"'));
  });

  it("A50/E2 Mod+K uses the same canonical link handler as toolbar", async () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/TaskDescriptionEditor.tsx"),
      "utf8",
    );
    expect(src).toMatch(/metaKey.*ctrlKey.*["']k["']/i);
    expect(src).toContain("addLink()");

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);
    const user = userEvent.setup();
    const seed: TaskDescriptionDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Link me" }] }],
    };
    render(<TaskDescriptionEditor value={seed} onChange={vi.fn()} />);
    const prose = screen.getByTestId("task-description-editor").querySelector(".ProseMirror") as HTMLElement;
    await user.click(prose);
    await user.keyboard("{Control>}k{/Control}");
    expect(promptSpy).toHaveBeenCalled();
    promptSpy.mockRestore();
  });

});
