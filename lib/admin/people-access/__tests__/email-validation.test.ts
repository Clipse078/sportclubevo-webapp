import { describe, expect, it, vi } from "vitest";
import {
  validateInvitationEmailSyntax,
  validateInvitationEmailMx,
} from "@/lib/admin/people-access/email-validation";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";
import { suggestEmailTypoCorrection } from "@/lib/admin/people-access/email-typo-suggestions";

describe("people-access email validation", () => {
  it("normalizes whitespace and domain case", () => {
    expect(normalizePeopleAccessEmail("  User@Example.COM  ")).toBe("User@example.com");
  });

  it("rejects invalid syntax examples", () => {
    for (const raw of [
      "abc",
      "abc@",
      "@domain.com",
      "abc@domain",
      "abc@gmail..com",
      "abc@-example.com",
      "abc@example-.com",
      "abc@exam ple.com",
      "abc@@example.com",
    ]) {
      expect(validateInvitationEmailSyntax(raw).ok).toBe(false);
    }
  });

  it("rejects implausible gmail.c and suggests gmail.com", () => {
    const result = validateInvitationEmailSyntax("test@gmail.c");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_EMAIL_DOMAIN");
    expect(result.suggestion).toBe("test@gmail.com");
    expect(suggestEmailTypoCorrection("test@gmail.con")).toBe("test@gmail.com");
    expect(suggestEmailTypoCorrection("user@gmal.com")).toBe("user@gmail.com");
  });

  it("accepts valid consumer and custom domains", () => {
    for (const raw of [
      "michael.duijster@icloud.com",
      "firstname.lastname+tag@gmail.com",
      "person@fcallschwil.ch",
      "contact@my-club-example.ch",
    ]) {
      expect(validateInvitationEmailSyntax(raw).ok).toBe(true);
    }
  });

  it("distinguishes unreachable domain from temporary DNS failure", async () => {
    const unreachable = await validateInvitationEmailMx("a@no-mx-example.invalid", async () => []);
    expect(unreachable.code).toBe("EMAIL_DOMAIN_UNREACHABLE");

    const temporary = await validateInvitationEmailMx("a@fcallschwil.ch", async () => {
      const err = new Error("timeout") as NodeJS.ErrnoException;
      err.code = "ETIMEOUT";
      throw err;
    });
    expect(temporary.code).toBe("EMAIL_DOMAIN_CHECK_TEMPORARY_FAILURE");
  });

  it("accepts when MX records exist (mocked)", async () => {
    const ok = await validateInvitationEmailMx("a@fcallschwil.ch", async () => [{ exchange: "mx.example.com" }]);
    expect(ok.ok).toBe(true);
  });
});
