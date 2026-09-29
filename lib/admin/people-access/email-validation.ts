import { z } from "zod";
import { parse as parseDomain } from "tldts";
import {
  emailHasIllegalWhitespace,
  normalizePeopleAccessEmail,
} from "@/lib/admin/people-access/email-normalize";
import { suggestEmailTypoCorrection } from "@/lib/admin/people-access/email-typo-suggestions";

export type EmailValidationCode =
  | "VALID"
  | "INVALID_EMAIL_FORMAT"
  | "INVALID_EMAIL_DOMAIN"
  | "EMAIL_DOMAIN_UNREACHABLE"
  | "EMAIL_DOMAIN_CHECK_TEMPORARY_FAILURE";

export type EmailValidationResult = {
  ok: boolean;
  normalized: string;
  code: EmailValidationCode;
  message?: string;
  suggestion?: string;
};

const practicalEmailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .refine((v) => !emailHasIllegalWhitespace(v), "illegal whitespace")
  .refine((v) => (v.match(/@/g) ?? []).length === 1, "single @ required")
  .email("invalid syntax");

function validateDomainPlausibility(domain: string): EmailValidationCode | null {
  const parsed = parseDomain(domain, { allowPrivateDomains: true });
  if (!parsed.domain || !parsed.publicSuffix) {
    return "INVALID_EMAIL_DOMAIN";
  }
  if (parsed.isIp) {
    return "INVALID_EMAIL_DOMAIN";
  }
  const labels = domain.split(".");
  for (const label of labels) {
    if (!label || label.startsWith("-") || label.endsWith("-")) {
      return "INVALID_EMAIL_DOMAIN";
    }
  }
  if (domain.includes("..")) {
    return "INVALID_EMAIL_DOMAIN";
  }
  const publicSuffix = parsed.publicSuffix;
  if (publicSuffix.length === 1 && !/^[a-z]{2}$/i.test(publicSuffix)) {
    return "INVALID_EMAIL_DOMAIN";
  }
  return null;
}

export function validateInvitationEmailSyntax(
  raw: string,
  options?: { allowTypoSuggestion?: boolean },
): EmailValidationResult {
  const allowTypoSuggestion = options?.allowTypoSuggestion !== false;
  const normalized = normalizePeopleAccessEmail(raw);
  if (!normalized) {
    return {
      ok: false,
      normalized: "",
      code: "INVALID_EMAIL_FORMAT",
      message: "Bitte gib eine gültige E-Mail-Adresse ein.",
    };
  }

  const syntax = practicalEmailSchema.safeParse(normalized);
  if (!syntax.success) {
    if (allowTypoSuggestion && normalized.includes("@")) {
      const suggestion = suggestEmailTypoCorrection(normalized);
      if (suggestion) {
        const fixed = validateInvitationEmailSyntax(suggestion, { allowTypoSuggestion: false });
        if (fixed.ok) {
          return {
            ok: false,
            normalized,
            code: "INVALID_EMAIL_DOMAIN",
            message: "Diese E-Mail-Adresse scheint nicht korrekt zu sein.",
            suggestion,
          };
        }
      }
    }
    return {
      ok: false,
      normalized,
      code: "INVALID_EMAIL_FORMAT",
      message: "Bitte gib eine gültige E-Mail-Adresse ein.",
    };
  }

  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  const domainIssue = validateDomainPlausibility(domain);
  if (domainIssue) {
    const suggestion = suggestEmailTypoCorrection(normalized);
    return {
      ok: false,
      normalized,
      code: domainIssue,
      message: suggestion
        ? "Diese E-Mail-Adresse scheint nicht korrekt zu sein."
        : "Die E-Mail-Domain ist ungültig oder unplausibel.",
      suggestion: suggestion ?? undefined,
    };
  }

  return { ok: true, normalized, code: "VALID" };
}

export type DnsMxValidationResult = EmailValidationResult;

export async function validateInvitationEmailMx(
  normalizedEmail: string,
  resolveMx: (domain: string) => Promise<Array<{ exchange: string }>>,
): Promise<DnsMxValidationResult> {
  const syntax = validateInvitationEmailSyntax(normalizedEmail);
  if (!syntax.ok) return syntax;

  const domain = syntax.normalized.slice(syntax.normalized.lastIndexOf("@") + 1);

  try {
    const mx = await resolveMx(domain);
    if (mx.length === 0) {
      return {
        ok: false,
        normalized: syntax.normalized,
        code: "EMAIL_DOMAIN_UNREACHABLE",
        message: "Diese Domain kann keine E-Mails empfangen.",
      };
    }
    return { ok: true, normalized: syntax.normalized, code: "VALID" };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return {
        ok: false,
        normalized: syntax.normalized,
        code: "EMAIL_DOMAIN_UNREACHABLE",
        message: "Diese Domain kann keine E-Mails empfangen.",
      };
    }
    return {
      ok: false,
      normalized: syntax.normalized,
      code: "EMAIL_DOMAIN_CHECK_TEMPORARY_FAILURE",
      message:
        "Die E-Mail-Domain konnte gerade nicht geprüft werden. Bitte versuche es erneut.",
    };
  }
}

/** Server-side authoritative validation (syntax + domain plausibility + MX). */
export async function validateInvitationEmailForServer(
  raw: string,
  resolveMx: (domain: string) => Promise<Array<{ exchange: string }>>,
): Promise<EmailValidationResult> {
  const syntax = validateInvitationEmailSyntax(raw);
  if (!syntax.ok) return syntax;
  return validateInvitationEmailMx(syntax.normalized, resolveMx);
}
