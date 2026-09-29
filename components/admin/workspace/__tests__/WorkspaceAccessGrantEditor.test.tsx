/**
 * @vitest-environment jsdom
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceAccessInheritanceMode } from "@prisma/client";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/sce/recipient/SceRecipientSelector", () => ({
  SceRecipientSelector: ({
    open,
    onPick,
  }: {
    open: boolean;
    onPick?: (pick: {
      type: string;
      id: string;
      label: string;
      metadata?: Record<string, unknown>;
    }) => void;
  }) =>
    open ? (
      <div data-testid="workspace-access-subject-selector-panel">
        <button
          type="button"
          data-testid="workspace-access-subject-selector-pick-organisation"
          onClick={() =>
            onPick?.({
              type: "ORG_UNIT",
              id: "organisation",
              label: "Organisation",
              metadata: { workspaceSubjectType: "ORGANISATION" },
            })
          }
        >
          pick-organisation
        </button>
        <button
          type="button"
          data-testid="workspace-access-subject-selector-pick-org-unit"
          onClick={() =>
            onPick?.({
              type: "ORG_UNIT",
              id: "ou-1",
              label: "Vereinsleitung",
            })
          }
        >
          pick-org-unit
        </button>
        <button
          type="button"
          data-testid="workspace-access-subject-selector-pick-team"
          onClick={() =>
            onPick?.({
              type: "TEAM",
              id: "team-1",
              label: "F2",
            })
          }
        >
          pick-team
        </button>
        <button
          type="button"
          data-testid="workspace-access-subject-selector-pick-person"
          onClick={() =>
            onPick?.({
              type: "PERSON",
              id: "person-1",
              label: "Michael Duijster",
            })
          }
        >
          pick-person
        </button>
        <button
          type="button"
          data-testid="workspace-access-subject-selector-pick-role"
          onClick={() =>
            onPick?.({
              type: "ROLE",
              id: "TRAINER",
              label: "Trainer/in",
              metadata: { roleFunctionKey: "TRAINER", workspaceRoleFunction: true },
            })
          }
        >
          pick-role
        </button>
      </div>
    ) : null,
}));

import { WorkspaceAccessGrantEditor } from "@/components/admin/workspace/WorkspaceAccessGrantEditor";
import type { WorkspaceAccessManagementViewModel } from "@/lib/workspace/access/access-management-dto";

const fetchMock = vi.fn();

function explicitViewModel(
  overrides: Partial<WorkspaceAccessManagementViewModel> = {},
): WorkspaceAccessManagementViewModel {
  return {
    resource: {
      id: "folder-1",
      resourceType: "FOLDER",
      name: "Finanzen",
      parentId: "root",
      parentName: "Root",
    },
    policyMode: WorkspaceAccessInheritanceMode.EXPLICIT,
    policyModeLabel: "Eingeschränkt",
    canManage: true,
    explicitGrants: [
      {
        id: "g1",
        audienceKind: "TEAM",
        audienceLabel: "U17",
        accessLevel: "MANAGE",
        accessLevelLabel: "Verwalten",
        accessLevelDescription: "",
        audienceKey: "TEAM:team-1",
        mutationFields: {
          subjectType: "TEAM",
          accessLevel: "MANAGE",
          teamId: "team-1",
        },
      },
    ],
    effectiveAccess: [
      {
        audienceKind: "TEAM",
        audienceLabel: "U17",
        audienceKey: "TEAM:team-1",
        effectiveLevel: "VIEW",
        effectiveLevelLabel: "Ansehen",
        configuredLevel: "MANAGE",
        configuredLevelLabel: "Verwalten",
        sourceLabel: "Direkt",
        whyLabel: "Über Team · U17",
        cappedByAncestor: true,
        ancestorCapLabel: "Durch übergeordneten Ordner auf Ansehen begrenzt",
        pathCount: 1,
        isInherited: false,
      },
    ],
    inheritedAccess: [],
    inheritDescription: "Eingeschränkt",
    restrictionSeedGrants: [
      { subjectType: "ORGANISATION", accessLevel: "VIEW" },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("WorkspaceAccessGrantEditor W03-A1", () => {
  it("W03-A1-01 MANAGE actor sees add grant control", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "addGrantButton" })).toBeInTheDocument();
  });

  it("W03-A1-02 Organisation can be chosen via canonical subject selector", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-organisation"));
    expect(screen.getByRole("button", { name: "searchButton" })).toBeInTheDocument();
  });

  it("W03-A1-08 EDIT level can be selected in add form", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    const addLevel = screen.getAllByLabelText("accessLevelField")[0];
    fireEvent.change(addLevel, { target: { value: "EDIT" } });
    expect((addLevel as HTMLSelectElement).value).toBe("EDIT");
  });

  it("W03-A1-09 MANAGE level can be selected in add form", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    const addLevel = screen.getAllByLabelText("accessLevelField")[0];
    fireEvent.change(addLevel, { target: { value: "MANAGE" } });
    expect((addLevel as HTMLSelectElement).value).toBe("MANAGE");
  });

  it("W03-A1-07 VIEW level can be selected", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    const levelSelect = screen.getAllByLabelText("accessLevelField")[0];
    fireEvent.change(levelSelect, { target: { value: "VIEW" } });
    expect((levelSelect as HTMLSelectElement).value).toBe("VIEW");
  });

  it("W03-A1-10 add grant invokes canonical PUT mutation", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ accessManagement: explicitViewModel() }),
    });
    const onUpdated = vi.fn();
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel({ explicitGrants: [] })}
        onViewModelUpdated={onUpdated}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-organisation"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "addGrantButton" }));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PUT");
    const body = JSON.parse(String(init.body)) as {
      accessInheritanceMode: string;
      grants: { subjectType: string }[];
    };
    expect(body.accessInheritanceMode).toBe("EXPLICIT");
    expect(body.grants.some((g) => g.subjectType === "ORGANISATION")).toBe(true);
  });

  it("W03-A1-11 existing grant level change invokes PUT", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ accessManagement: explicitViewModel() }),
    });
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    const rowSelect = screen.getByDisplayValue("Verwalten");
    await act(async () => {
      fireEvent.change(rowSelect, { target: { value: "EDIT" } });
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as {
      grants: { accessLevel: string; teamId?: string }[];
    };
    expect(body.grants.some((g) => g.accessLevel === "EDIT" && g.teamId === "team-1")).toBe(
      true,
    );
  });

  it("W03-A1-12 explicit grant can be removed via PUT", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        accessManagement: explicitViewModel({ explicitGrants: [] }),
      }),
    });
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "removeGrant" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as {
      grants: unknown[];
    };
    expect(body.grants).toHaveLength(0);
  });

  it("W03-A1-14 ancestor cap remains visible after level change UI", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Durch übergeordneten Ordner auf Ansehen begrenzt"),
    ).toBeInTheDocument();
  });

  it("W03-A1-20 mutation rejection does not call success handler", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Rejected" }),
    });
    const onUpdated = vi.fn();
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel({ explicitGrants: [] })}
        onViewModelUpdated={onUpdated}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-organisation"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "addGrantButton" }));
    });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Rejected"));
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("W03-A1-03 OrgUnit selection uses canonical SCE subject selector", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-org-unit"));
    expect(screen.getByText("Vereinsleitung")).toBeInTheDocument();
  });

  it("W03-A1-04 Team selection uses canonical SCE subject selector", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-team"));
    expect(screen.getByText("F2")).toBeInTheDocument();
  });

  it("W03-A1-05 Role function keys use workspace function semantics", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-role"));
    expect(screen.getByText("Trainer/in")).toBeInTheDocument();
  });

  it("W03-A1-06 Person selection uses canonical SCE subject selector", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-person"));
    expect(screen.getByText("Michael Duijster")).toBeInTheDocument();
  });

  it("W03-A1-15 technical workspace RBAC keys are not exposed as role labels", () => {
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel()}
        onViewModelUpdated={vi.fn()}
      />,
    );
    expect(screen.queryByText("workspace.manage")).toBeNull();
  });

  it("W03-A1-22 actor losing MANAGE triggers callback", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden" }),
    });
    const onLost = vi.fn();
    render(
      <WorkspaceAccessGrantEditor
        apiBase="/api/workspace/folders/folder-1/access"
        viewModel={explicitViewModel({ explicitGrants: [] })}
        onViewModelUpdated={vi.fn()}
        onManageAccessLost={onLost}
      />,
    );
    fireEvent.click(screen.getByTestId("workspace-access-subject-add"));
    fireEvent.click(screen.getByTestId("workspace-access-subject-selector-pick-organisation"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "addGrantButton" }));
    });
    await waitFor(() => expect(onLost).toHaveBeenCalled());
  });
});
