import { describe, expect, it } from "vitest";
import {
  assertCamt054Filename,
  assertCamt054UploadWithinLimit,
  CAMT054_MAX_UPLOAD_BYTES,
} from "../camt054-upload-limits";

describe("camt054 upload limits", () => {
  it("accepts xml filenames", () => {
    expect(() => assertCamt054Filename("statement.xml")).not.toThrow();
  });

  it("rejects non-xml", () => {
    expect(() => assertCamt054Filename("statement.csv")).toThrow();
  });

  it("enforces size limit", () => {
    expect(() => assertCamt054UploadWithinLimit(CAMT054_MAX_UPLOAD_BYTES + 1)).toThrow();
  });
});
