import type { MeetingStatus, ReviewWorkflowStage } from "@prisma/client";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import type { BuildMeetingProtocolDocumentInput } from "@/lib/meetings/meeting-protocol-document";

const baseMeeting = {
  id: "m1",
  slug: "test-sitzung-ii",
  title: "Test-Sitzung II",
  description: "Zweite Testsitzung des Vorstands.",
  meetingDate: new Date("2026-06-15T18:00:00.000Z"),
  location: "Clubhaus · Sitzungszimmer",
  attendeeCount: 4,
  plannedDurationMin: 90,
  status: "COMPLETED" as MeetingStatus,
  conductedAt: new Date("2026-06-15T18:05:00.000Z"),
  closedAt: new Date("2026-06-15T19:45:00.000Z"),
  protocolApprovalRequired: true,
  protocolApprovalRule: "ALL" as const,
  protocolApproverPersonIds: ["person-1"],
  protocolContentRevision: 2,
  lastReopenReason: null,
  reviewStage: "APPROVED" as ReviewWorkflowStage,
  requiresFourEyeReview: false,
  visibilityScope: "ORGANISATION" as const,
  createdByUserId: "user-1",
  visibleRoleRefs: [],
  visibleUserRefs: [],
  visibleTeamRefs: [],
  visibleOrgUnitRefs: [],
  visiblePersonRefs: [],
  visibleTargetGroupRefs: [],
  reviewedByUserId: null,
  reviewedAt: null,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-16T00:00:00.000Z"),
};

export const completedMeetingProtocolFixture: BuildMeetingProtocolDocumentInput = {
  meeting: baseMeeting,
  tenant: {
    name: "Demo Sportclub",
    logoUrl: "https://cdn.example.test/logo.png",
    primaryColor: "#0b4aa2",
    locale: "de-CH",
    timezone: "Europe/Zurich",
  },
  exportedAt: new Date("2026-06-16T10:00:00.000Z"),
  protocolVotes: [
    {
      approverPersonId: "person-1",
      approverLabel: "Anna Admin",
      decision: "APPROVED",
      comment: null,
      decidedAt: new Date("2026-06-16T09:00:00.000Z"),
    },
  ],
  decisionVotesByDecisionId: {},
  meetingTasks: [],
  decisionTasksByDecisionId: {},
  subEntities: {
    participants: [
      { id: "p1", name: "Anna Admin", role: "Präsidentin", status: "PRESENT", userId: null, personId: "person-1" },
      { id: "p2", name: "Ben Beisitzer", role: null, status: "EXCUSED", userId: null, personId: "person-2" },
      { id: "p3", name: "Gast Referent", role: "Gast", status: "PRESENT", userId: null, personId: null },
      { id: "p4", name: "Nicht erschienen", role: null, status: "ABSENT", userId: null, personId: "person-4" },
      { id: "p5", name: "Offene Einladung", role: null, status: "INVITED", userId: null, personId: "person-5" },
    ],
    agendaItems: [
      {
        id: "a1",
        title: "Begrüssung",
        notes: "Kurze Begrüssung und Feststellung des Beschlussfähigkeit.",
        owner: "Anna Admin",
        ownerPersonId: "person-1",
        durationMin: 10,
        initiativeId: null,
        orderIndex: 1,
        status: "DISCUSSED",
        sourceAgendaItemId: null,
        initiative: null,
      },
      {
        id: "a2",
        title: "Budget 2026",
        notes: "Diskussion über Prioritäten.\n\nKeine Einwände.",
        owner: "Ben Beisitzer",
        ownerPersonId: "person-2",
        durationMin: 30,
        initiativeId: "init-1",
        orderIndex: 2,
        status: "DISCUSSED",
        sourceAgendaItemId: null,
        initiative: {
          id: "init-1",
          slug: "budget-2026",
          title: "Budgetplanung 2026",
          summary: "Vorbereitete Eckpunkte der Budgetplanung.",
          description: null,
          status: "PLANNED",
        },
      },
    ],
    decisions: [
      {
        id: "d1",
        title: "Budget 2026 genehmigt",
        description: "Der Vorstand genehmigt das Budget 2026 in der vorliegenden Fassung.",
        rationale: "Finanzen sind tragfähig.",
        status: "CONFIRMED",
        owner: "Anna Admin",
        ownerPersonId: "person-1",
        orderIndex: 1,
        sourceAgendaItemId: "a2",
        approvalRequired: true,
        approvalRule: "ALL",
        approverPersonIds: ["person-1"],
        approvalStatus: "APPROVED",
        approvalContentRevision: 1,
        linkedRefs: null,
      },
    ],
    actions: [
      {
        id: "act1",
        title: "Finanzunterlagen veröffentlichen",
        description: "Mitglieder informieren.",
        expectedOutcome: "Transparenz bis August.",
        owner: "Ben Beisitzer",
        ownerPersonId: "person-2",
        dueDate: new Date("2026-08-01T00:00:00.000Z"),
        status: "OPEN",
        linkedRefs: { agendaItemId: "a2" },
      },
      {
        id: "act2",
        title: "Separater Nachverfolgungsschritt",
        description: null,
        expectedOutcome: null,
        owner: null,
        ownerPersonId: null,
        dueDate: null,
        status: "OPEN",
        linkedRefs: null,
      },
    ],
  } satisfies MeetingSubEntities,
};

export const plannedMeetingProtocolFixture: BuildMeetingProtocolDocumentInput = {
  ...completedMeetingProtocolFixture,
  meeting: {
    ...baseMeeting,
    status: "PLANNED",
    conductedAt: null,
    closedAt: null,
    reviewStage: "DRAFT",
  },
  protocolVotes: [],
  subEntities: {
    ...completedMeetingProtocolFixture.subEntities,
    participants: [],
    decisions: [],
    actions: [],
  },
};

export const missingLogoFixture: BuildMeetingProtocolDocumentInput = {
  ...completedMeetingProtocolFixture,
  tenant: {
    ...completedMeetingProtocolFixture.tenant,
    logoUrl: null,
  },
};

export const locationWithSecretFixture: BuildMeetingProtocolDocumentInput = {
  ...completedMeetingProtocolFixture,
  meeting: {
    ...baseMeeting,
    location:
      "Online · https://meet.example.test/room/abc?password=supersecret&token=abc123",
  },
};
