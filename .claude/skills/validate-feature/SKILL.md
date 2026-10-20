---
name: validate-feature
description: Validates the current feature against its spec's validation.md — runs all automated checks, verifies required test coverage, drives the manual checks in a browser with Playwright where possible, reviews architecture rules, and reports a pass/fail checklist. Use when the user says "validate", "validate the feature", "is it ready to merge", "check the spec", or invokes /validate-feature.
---

# Validate Feature

## 1. Load

Find the spec dir for the current `phase-N-*` branch (`**Roadmap phase:** N` in `requirements.md`). Read `validation.md` and `requirements.md`.

## 2. Automated checks

Run each and record exit code and a one-line summary:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

For each item under "Specific coverage required", find the test that proves it (grep test names). Missing test → FAIL with the file where it should go.

## 3. Architecture review (automatable greps)

- No imports of `dexie` or `@/data/adapters` outside `src/data/` (`grep -rn "from 'dexie'\|data/adapters" src --include=*.ts --include=*.tsx`).
- No `Date.now()` / `new Date()` used for "now" in `src/domain/` or `src/simulator/`.
- No hard-coded Spanish UI strings in components (spot-check JSX text nodes outside `src/i18n/`).
- Every new domain command appends a `HospitalEvent`.
- Only dependencies listed in `specs/tech-stack.md` in `package.json`.

## 4. Manual checks

For each manual item, attempt it with Playwright against `npm run preview` (or `npm run dev`): navigate, run the simulator at 60× if relevant, take screenshots at 1920×1080, 1280×800, 1024×768 and 390×844, and look at them. Mark items you verified as PASS with the evidence (screenshot path); mark items that need a human (install prompt, iPad, subjective look) as **NEEDS HUMAN** with exact steps.

## 5. Independent review (for large phases)

For phases touching domain logic or more than ~15 files, spawn a fresh subagent that has not seen the implementation conversation to review the branch diff (`git diff main...HEAD`) against `requirements.md` and `specs/domain.md`, looking for spec mismatches, missing edge cases and rule violations. Include its findings.

## 6. Report

- Update the checkboxes in `validation.md` for items that passed (leave unverified ones unchecked).
- Reply with a table: item → PASS / FAIL / NEEDS HUMAN → evidence or fix.
- If everything passes (and the user confirms NEEDS HUMAN items), suggest "ship it". Otherwise propose fixes and offer to apply them.
