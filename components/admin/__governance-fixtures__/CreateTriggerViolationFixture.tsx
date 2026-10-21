"use client";

/** DS-11 governance test fixture — missing modal-first marker. */
export default function CreateTriggerViolationFixture() {
  return (
    <button type="button" className="fca-button-primary" onClick={() => undefined}>
      Create entity
    </button>
  );
}
