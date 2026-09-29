/**
 * SCE-SELECTOR-02R3 — FCA-shaped fixtures + runtime discovery/eligibility contracts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { browsePersonSelectorItems } from "@/lib/sce/list-selector/sources/person-selector-source";
import { allowedSourceTypesForSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";
import { SCE_RECIPIENT_SELECTOR_REQUIREMENT } from "@/lib/sce/recipient/sce-recipient-selector-config";

const eligibleMocks = vi.hoisted(() => ({
  listEligibleTaskAssigneePersons: vi.fn(),
  searchEligibleTaskAssigneePersons: vi.fn(),
}));

const discoveryMocks = vi.hoisted(() => ({
  browseDiscoverableTenantPersons: vi.fn(),
  searchDiscoverableTenantPersons: vi.fn(),
}));

vi.mock("@/lib/tasks/eligible-task-assignee-persons", () => ({
  listEligibleTaskAssigneePersons: eligibleMocks.listEligibleTaskAssigneePersons,
  searchEligibleTaskAssigneePersons: eligibleMocks.searchEligibleTaskAssigneePersons,
}));

vi.mock("@/lib/people/tenant-person-discovery", () => ({
  browseDiscoverableTenantPersons: discoveryMocks.browseDiscoverableTenantPersons,
  searchDiscoverableTenantPersons: discoveryMocks.searchDiscoverableTenantPersons,
}));

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-SELECTOR-02R3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("REQUIREMENT_AUDIENCE server sources are PERSON only", () => {
    expect(allowedSourceTypesForSelectorAuthorizationContext("REQUIREMENT_AUDIENCE")).toEqual([
      "PERSON",
    ]);
    expect(SCE_RECIPIENT_SELECTOR_REQUIREMENT.sourceTypes).toEqual(["PERSON"]);
    expect(SCE_RECIPIENT_SELECTOR_REQUIREMENT.searchPlaceholder).toBe("Personen suchen …");
    expect(SCE_RECIPIENT_SELECTOR_REQUIREMENT.dialogDescription).toBe(
      "Wer soll die Anforderung bestätigen?",
    );
  });

  it("task assignment browse uses TASK policy identities with linkedUserId metadata", async () => {
    eligibleMocks.listEligibleTaskAssigneePersons.mockResolvedValue([
      {
        personId: "person-michael",
        userId: "user-michael",
        tenantId: "tenant-fca",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: "Michael Duijster",
        email: "it@fcallschwil.ch",
      },
    ]);

    const page = await browsePersonSelectorItems({
      tenantId: "tenant-fca",
      actorUserId: "user-michael",
      authorizationContext: "TASK_ASSIGNMENT",
      limit: 20,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.metadata?.linkedUserId).toBe("user-michael");
  });

  it("requirement browse uses canonical tenant person discovery (no structural sources)", async () => {
    discoveryMocks.browseDiscoverableTenantPersons.mockResolvedValue([
      {
        personId: "p1",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: "Michael Duijster",
        email: "it@fcallschwil.ch",
      },
      {
        personId: "p2",
        firstName: "Test",
        lastName: "User",
        displayName: "Test User",
        email: null,
      },
    ]);

    const page = await browsePersonSelectorItems({
      tenantId: "tenant-fca",
      actorUserId: "user-michael",
      authorizationContext: "REQUIREMENT_AUDIENCE",
      limit: 20,
    });

    expect(discoveryMocks.browseDiscoverableTenantPersons).toHaveBeenCalledWith("tenant-fca", 20, 0);
    expect(page.items).toHaveLength(2);
    expect(page.items.every((item) => item.type === "PERSON")).toBe(true);
  });

  it("TaskPeopleMultiPicker and RequirementAudienceBuilder stay on SCE engine with expected config", () => {
    const taskPicker = read("components/admin/aufgaben/TaskPeopleMultiPicker.tsx");
    expect(taskPicker).toContain('authContext="TASK_ASSIGNMENT"');
    expect(taskPicker).toContain('sourceTypes={["PERSON"]}');

    const requirement = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(requirement).toContain("SceRecipientSelector");
    expect(requirement).toContain("SCE_RECIPIENT_SELECTOR_REQUIREMENT");
    expect(requirement).not.toContain("Teams, Organisation, Rollen und Zielgruppen");
  });
});
