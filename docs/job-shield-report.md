# SafeRoute Job Shield Report

> **Branch:** `feat/job-shield`  
> **Status:** Fully Implemented & Tested (Frontend + Backend)  
> **Target Audience:** Migrant workers seeking cross-border employment in Southeast Asia (Thailand, Myanmar, Indonesia, Philippines)

---

## 1. Executive Summary

**Job Shield** is a decision-support capability built into SafeRoute that compares what a job advertisement promises with what a recruiter subsequently demands in chat messages, before a migrant worker pays an advance deposit, hands over identity documents, or travels to a vulnerable border region.

The core insight is that human trafficking and recruitment fraud rarely announce themselves in the initial flyer. The flyer promises a legitimate job in Bangkok with free placement and a signed contract; the recruiter later instructs the worker via WhatsApp or Telegram to transfer a deposit, surrender their physical passport, or meet an unknown driver at a border crossing like Mae Sot.

Job Shield extracts structured facts from both sources, lets the user review and correct them in an interactive "Is this right?" screen, and evaluates them using **deterministic rules written in code, not model whims**.

---

## 2. Key User Flow & Architecture

```
[CheckScreen (Job Tab)]
       │
       ├─ Source 1: Job Ad (Flyer image or text)
       └─ Source 2: Recruiter Chat (Screenshot or text)
       │
       ▼
[POST /v1/job/extract] ── Gemini Multimodal Fact Extraction (LRU Cached 10m)
       │
       ▼
[JobFactsScreen] ──────── "Is this right?" Fact Review & Corrections (Editable)
       │
       ▼
[POST /v1/job/assess] ─── Deterministic Conflict Rules & Border Protection
       │
       ▼
[ReportScreen] ────────── Attention Banner ("Pause" / "Verify" / "Proceed with caution")
                         "What doesn't match" Side-by-Side Comparison Cards
                         "Still unclear" Critical Unmentioned Questions
                         "Leave quickly" Instant Home Reset
```

---

## 3. Conflict Rules & Scoring Engine

Conflict detection is completely deterministic in [`server/src/job/rules.ts`](file:///D:/scamshield/server/src/job/rules.ts):

| Conflict Type | Ad Claim | Recruiter Instruction | Flag Family | Severity | Impact |
|---|---|---|---|---|---|
| **Fee Conflict** | No fee / free placement promised | Deposit or upfront payment demanded | `payment_route` | High | Elevates score to >= 50 |
| **Document Retention** | Any or none mentioned | Physical passport retention / hold demanded | `trafficking` | High | Directly triggers score >= 80 (`pause`) |
| **Contract Deferral** | Official contract offered upfront | Contract delayed until arrival / after border | `payment_route` | High | Elevates score to >= 50 |
| **Visa Downgrade** | Legal work visa / permit promised | Tourist visa or informal border pass instructed | `trafficking` | High | Directly triggers score >= 80 (`pause`) |
| **Meeting Point / Route** | Normal workplace address | Driver pickup, boat, or border river crossing | `trafficking` | Medium | Flags trafficking risk |
| **Employer Mismatch** | Verified company name in ad | Unregistered entity or personal chat | `identity` | Medium | Flags identity discrepancy |
| **Salary Discrepancy** | High advertised wage | Significantly lower wage offered in chat | `too_good` | Medium | Flags misleading terms |

### Strict Safety & Policy Safeguards
1. **Never Certify Safe:** No output from Job Shield ever claims an offer is "safe", "verified job", or "scam confirmed".
2. **Never Call a Person a Trafficker:** The report flags specific "warning signs" and "discrepancies", empowering the worker and their family to pause and verify.
3. **Border Location Protection:** Border towns (Mae Sot, Tachileik, Myawaddy, Poipet, etc.) are treated strictly as contextual signals. By policy, mentioning a border town alone **never** elevates attention to `pause` without an explicit non-geographic risk (such as passport surrender, upfront fee, or secrecy demand).
4. **"Leave quickly" Button:** Available prominently on both `JobFactsScreen` and `ReportScreen` to immediately reset the app to the home screen if the recruiter enters the room.

---

## 4. Attention Tiers

Job Shield maps risk scores directly into three actionable attention tiers:

- **`pause` (Score >= 70):** High-risk demands detected (e.g., passport retention, advance fees, visa evasion). Guidance: Pause all actions, do not transfer funds, and contact official hotlines.
- **`verify` (Score 35–69):** Terms conflict detected (e.g., unconfirmed workplace, employer mismatch, delayed contract). Guidance: Request confirmed terms in writing before committing.
- **`lower` (Score < 35):** Proceed with caution. No severe red flags detected, but reminds workers to never surrender original identity documents.

---

## 5. Verification & Test Suite

### Server Test Suite
- `server/test/job-rules.test.ts`: **15/15 passed** (Validates every conflict rule, border protection edge cases, and unclear fields).
- `server/test/job-api.test.ts`: **4/4 passed** (Integration tests for `POST /v1/job/extract` and `POST /v1/job/assess`).
- `server/test/job-pairs.test.ts`: **11/11 passed** (10 evaluation pairs across English, Burmese, Thai, and Indonesian with 100% tier criteria compliance).
- Entire server test suite: **393 tests passed** across 29 test files.
- Biome check: **0 errors, 0 warnings** in all job modules.

### Frontend Test Suite
- `src/__tests__/jobShield.test.ts`: **5/5 passed** (Validates HTTP client, offline mock client, banned certainty phrase checks, and request validation).
- Entire client test suite: **228 tests passed** across 24 test suites.
- TypeScript (`pnpm typecheck`): **0 errors**.
- ESLint (`pnpm lint --max-warnings 0`): **0 warnings, 0 errors**.
- i18n key audit (`scripts/i18n-check.mjs`): **0 missing keys** across all 4 supported regional languages (`my`, `id`, `tl`, `th`).
- Hotlines sync (`scripts/sync-hotlines.mjs --check`): **52 hotlines verified**.
