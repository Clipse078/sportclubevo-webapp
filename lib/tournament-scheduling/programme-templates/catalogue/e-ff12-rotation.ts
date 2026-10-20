/**
 * Curated E/FF12 youth rotation Spielpläne (abstract structure — no external branding).
 * Reference document ids point to approved play-more-football Spielplankarten (maintainer only).
 */

import {
  buildFiveFieldRotationTemplate,
  buildRotationTemplate,
  buildSixFieldRotationTemplate,
  buildThreeFieldRotationTemplate,
} from "./build-template";
import type { TournamentProgrammeTemplate } from "../types";

const REF_4 = "play-more-football:e-ff12:4-teams-rotation:v20220504";
const REF_5 = "play-more-football:e-ff12:5-teams-rotation:v20220504";
const REF_6 = "play-more-football:e-ff12:6-teams-rotation:v20220504";
const REF_7 = "play-more-football:e-ff12:7-teams-rotation:v20220504";
const REF_8 = "play-more-football:e-ff12:8-teams-rotation:v20220504";

export const E_FF12_ROTATION_4_TEMPLATE: TournamentProgrammeTemplate =
  buildThreeFieldRotationTemplate({
    id: "e-ff12-youth-rotation-4",
    version: 1,
    participantCount: 4,
    breakAfterRoundNumber: 3,
    referenceDocumentId: REF_4,
    rounds: [
      [1, [1, "C1", "D1"], [2, "C2", "D2"], [3, "A", "B"]],
      [2, [1, "A1", "C1"], [2, "A2", "C2"], [3, "B", "D"]],
      [3, [1, "B1", "D1"], [2, "B2", "D2"], [3, "A", "C"]],
      [4, [1, "D1", "A1"], [2, "D2", "A2"], [3, "C", "B"]],
      [5, [1, "B1", "C1"], [2, "B2", "C2"], [3, "A", "D"]],
      [6, [1, "A1", "B1"], [2, "A2", "B2"], [3, "D", "C"]],
    ],
  });

export const E_FF12_ROTATION_5_TEMPLATE: TournamentProgrammeTemplate =
  buildFiveFieldRotationTemplate({
    id: "e-ff12-youth-rotation-5",
    version: 1,
    participantCount: 5,
    breakAfterRoundNumber: 4,
    referenceDocumentId: REF_5,
    rounds: [
      [1, [1, "D1", "E1"], [2, "C1", "C2"], [3, "D2", "E2"], [5, "A", "B"]],
      [2, [1, "A1", "D1"], [2, "B1", "B2"], [3, "A2", "D2"], [4, "E", "C"]],
      [3, [1, "C1", "B1"], [2, "E1", "E2"], [3, "C2", "B2"], [5, "A", "D"]],
      [4, [1, "E1", "B1"], [2, "D1", "D2"], [3, "E2", "B2"], [4, "A", "C"]],
      [5, [4, "B", "E"], [5, "C", "D"]],
      [6, [2, "C1", "C2"], [4, "D", "B"], [5, "A", "E"]],
      [7, [1, "A1", "C1"], [2, "B1", "B2"], [3, "A2", "C2"], [4, "E", "D"]],
    ],
  });

export const E_FF12_ROTATION_6_TEMPLATE: TournamentProgrammeTemplate =
  buildSixFieldRotationTemplate({
    id: "e-ff12-youth-rotation-6",
    version: 1,
    participantCount: 6,
    breakAfterRoundNumber: 4,
    referenceDocumentId: REF_6,
    rounds: [
      [1, [1, "F1", "A1"], [4, "F2", "A2"], [5, "B", "E"], [6, "C", "D"]],
      [2, [1, "E1", "B1"], [4, "E2", "B2"], [5, "A", "C"], [6, "F", "D"]],
      [3, [1, "F1", "C1"], [2, "D1", "B1"], [4, "F2", "C2"], [5, "D2", "B2"], [6, "A", "E"]],
      [4, [1, "A1", "D1"], [4, "A2", "D2"], [5, "B", "F"], [6, "E", "C"]],
      [5, [1, "C1", "B1"], [2, "F1", "E1"], [4, "C2", "B2"], [5, "F2", "E2"], [6, "A", "D"]],
      [6, [1, "D1", "E1"], [4, "D2", "E2"], [5, "F", "C"], [6, "A", "B"]],
      [7, [2, "A1", "C1"], [4, "A2", "C2"], [5, "B", "D"], [6, "F", "E"]],
    ],
  });

export const E_FF12_ROTATION_7_TEMPLATE: TournamentProgrammeTemplate = buildFiveFieldRotationTemplate(
  {
    id: "e-ff12-youth-rotation-7",
    version: 1,
    participantCount: 7,
    breakAfterRoundNumber: 4,
    referenceDocumentId: REF_7,
    rounds: [
      [1, [1, "A1", "E1"], [2, "D1", "D2"], [3, "A2", "E2"], [4, "G", "C"], [5, "B", "F"]],
      [2, [1, "B1", "D1"], [2, "F1", "F2"], [3, "B2", "D2"], [4, "E", "G"], [5, "A", "C"]],
      [3, [1, "E1", "C1"], [2, "B1", "B2"], [3, "E2", "C2"], [4, "F", "D"], [5, "G", "A"]],
      [4, [1, "F1", "G1"], [2, "E1", "E2"], [3, "F2", "G2"], [4, "A", "D"], [5, "B", "C"]],
      [5, [1, "C1", "D1"], [2, "G1", "G2"], [3, "C2", "D2"], [4, "A", "B"], [5, "E", "F"]],
      [6, [1, "F1", "A1"], [2, "C1", "C2"], [3, "F2", "A2"], [4, "B", "E"], [5, "D", "G"]],
      [7, [1, "B1", "G1"], [2, "A1", "A2"], [3, "B2", "G2"], [4, "C", "F"], [5, "D", "E"]],
    ],
  },
);

export const E_FF12_ROTATION_8_TEMPLATE: TournamentProgrammeTemplate =
  buildSixFieldRotationTemplate({
    id: "e-ff12-youth-rotation-8",
    version: 1,
    participantCount: 8,
    breakAfterRoundNumber: 4,
    referenceDocumentId: REF_8,
    rounds: [
      [1, [1, "C1", "D1"], [2, "E1", "F1"], [3, "C2", "D2"], [4, "E2", "F2"], [5, "A", "B"], [6, "G", "H"]],
      [2, [1, "A1", "H1"], [2, "B1", "G1"], [3, "A2", "H2"], [4, "B2", "G2"], [5, "C", "F"], [6, "D", "E"]],
      [3, [1, "B1", "D1"], [2, "A1", "C1"], [3, "B2", "D2"], [4, "A2", "C2"], [5, "F", "H"], [6, "E", "G"]],
      [4, [1, "F1", "G1"], [2, "E1", "H1"], [3, "F2", "G2"], [4, "E2", "H2"], [5, "A", "D"], [6, "B", "C"]],
      [5, [1, "C1", "H1"], [2, "D1", "G1"], [3, "C2", "H2"], [4, "D2", "G2"], [5, "B", "E"], [6, "F", "A"]],
      [6, [1, "A1", "E1"], [2, "B1", "F1"], [3, "A2", "E2"], [4, "B2", "F2"], [5, "G", "C"], [6, "H", "D"]],
      [7, [1, "C1", "E1"], [2, "F1", "D1"], [3, "C2", "E2"], [4, "F2", "D2"], [5, "A", "G"], [6, "B", "H"]],
    ],
  });

export const E_FF12_ROTATION_TEMPLATES: readonly TournamentProgrammeTemplate[] = [
  E_FF12_ROTATION_4_TEMPLATE,
  E_FF12_ROTATION_5_TEMPLATE,
  E_FF12_ROTATION_6_TEMPLATE,
  E_FF12_ROTATION_7_TEMPLATE,
  E_FF12_ROTATION_8_TEMPLATE,
];
