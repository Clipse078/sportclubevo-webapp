# PEOPLE-ACCESS-IMPERSONATION-01 — Club Admin impersonation availability / discoverability

**Status:** OPEN / SEPARATE

**Not an SCE-PLANNER-UX-08-04 merge blocker**

---

## Observed behavior (08-04 Human UAT)

Authenticated **FCA Club Admin** on Vercel Preview could **not** use the expected **«Als Benutzer ansehen»** flow to test Sandra / read-only personas during permission-focused Human UAT.

---

## Scope of this follow-up

Record the observation and request **future diagnosis** only.

Do **not** diagnose root cause in the 08-04 package. Potential causes (for future investigation, not asserted here) may include permission gating, UI visibility, target account state, invitation / activation state, or other canonical impersonation restrictions.

---

## Impact on 08-04 closure

08-04 authorization closure does **not** depend on manual impersonation for this session:

- Club Admin manual Human UAT = PASS
- Allocation-only / cross-domain capability behavior = automated PASS
- Read-only negative behavior = automated PASS
- SFV / provider authority = automated regression PASS (previously Human-UAT-proven in 08-03)
- Tenant isolation = automated PASS
- Stale permission handling = automated PASS
