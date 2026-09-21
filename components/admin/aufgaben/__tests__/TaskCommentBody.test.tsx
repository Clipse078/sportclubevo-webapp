/**
 * @vitest-environment jsdom
 * AUFGABEN-06B — safe mention rendering (no dangerouslySetInnerHTML).
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskCommentBody } from "../TaskCommentBody";

describe("TaskCommentBody", () => {
  it("renders structured mention highlight only for known mentions", () => {
    render(
      <TaskCommentBody
        body="Hi @Sandra — please check"
        mentions={[{ userId: "u1", displayName: "Sandra Schmid" }]}
      />,
    );
    expect(screen.queryByTestId("task-comment-mention")).not.toBeInTheDocument();
    expect(screen.getByText(/Hi @Sandra — please check/)).toBeInTheDocument();
  });

  it("highlights canonical mention token in body", () => {
    render(
      <TaskCommentBody
        body="Hi @Sandra Schmid please"
        mentions={[{ userId: "u1", displayName: "Sandra Schmid" }]}
      />,
    );
    expect(screen.getByTestId("task-comment-mention")).toHaveTextContent("@Sandra Schmid");
  });

  it("HTML-looking input stays plain text", () => {
    render(
      <TaskCommentBody
        body={'<script>alert(1)</script> @Nobody'}
        mentions={[]}
      />,
    );
    expect(document.querySelector("[dangerouslySetInnerHTML]")).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
  });

  it("duplicate display names — only structured mention id resolves highlight", () => {
    render(
      <TaskCommentBody
        body="@Sandra A and @Sandra B"
        mentions={[{ userId: "u-a", displayName: "Sandra A" }]}
      />,
    );
    const mentions = screen.getAllByTestId("task-comment-mention");
    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toHaveTextContent("@Sandra A");
  });

  it("unicode preserved in plain text segments", () => {
    render(
      <TaskCommentBody body="Grüsse 🙂" mentions={[]} />,
    );
    expect(screen.getByText("Grüsse 🙂")).toBeInTheDocument();
  });
});
