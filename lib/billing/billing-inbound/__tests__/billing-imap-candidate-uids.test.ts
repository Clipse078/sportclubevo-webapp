import { describe, expect, it } from "vitest";
import { pickBillingImapCandidateUids } from "../billing-imap-candidate-uids";

describe("pickBillingImapCandidateUids", () => {
  it("returns no candidates when search is empty (caught up)", () => {
    expect(pickBillingImapCandidateUids([], 2, 25)).toEqual([]);
  });

  it("returns only UIDs greater than the cursor", () => {
    expect(pickBillingImapCandidateUids([1, 2, 3], 2, 25)).toEqual([3]);
  });

  it("returns multiple UIDs in ascending order", () => {
    expect(pickBillingImapCandidateUids([5, 3, 4], 2, 25)).toEqual([3, 4, 5]);
  });

  it("limits to the batch size", () => {
    const uids = Array.from({ length: 30 }, (_, index) => index + 3);
    expect(pickBillingImapCandidateUids(uids, 2, 25)).toHaveLength(25);
    expect(pickBillingImapCandidateUids(uids, 2, 25)[0]).toBe(3);
    expect(pickBillingImapCandidateUids(uids, 2, 25)[24]).toBe(27);
  });
});
