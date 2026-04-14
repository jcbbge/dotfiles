---
name: debug-hypothesis
description: Use when debugging any non-trivial bug — wrong output, crash, flaky test, performance regression, or "it works locally but not in CI." Forces a scientific-method loop (Observe → Hypothesize → Experiment → Conclude) so the agent stops guessing and starts reasoning.
argument-hint: <brief description of the bug or issue>
disable-model-invocation: false
allowed-tools: Bash Read Write Edit Glob Grep WebFetch
---

$ARGUMENTS

You are entering hypothesis-driven debugging. Follow the four-phase loop exactly as specified below.

---

## Phase 1: OBSERVE

**Goal.** Collect raw facts. Reproduce the bug. Separate what you *know* from what you *assume*.

**Steps.**

1. Reproduce the bug. Get the exact error message, stack trace, or wrong output.
   If you cannot reproduce it, that is your first finding.
2. Find the minimal reproduction. Strip away unrelated code until the bug
   still appears.
3. Record the environment: OS, runtime version, dependencies, config.
4. Note what *does* work. The boundary between working and broken is
   where the bug lives.
5. Write all observations to `DEBUG.md` under `## Observations`.

**Exit criteria.**

- [ ] Bug reproduced (or documented as non-reproducible with conditions)
- [ ] Exact error message or wrong behavior recorded
- [ ] Minimal reproduction identified
- [ ] Observations written to `DEBUG.md`

---

## Phase 2: HYPOTHESIZE

**Goal.** Generate 3-5 possible root causes. For each, list supporting
and conflicting evidence from Phase 1. Rank by likelihood.

**Steps.**

1. List 3-5 hypotheses. Not 1. Not "I think it's X." Three minimum.
   Think across categories:
   - Data: wrong input, missing field, type mismatch, encoding
   - Logic: wrong condition, off-by-one, race condition, wrong order
   - Environment: config, version, dependency, permissions
   - State: stale cache, leaked state, initialization order
2. For each hypothesis, write:
   - **Supports:** evidence from observations that backs this theory
   - **Conflicts:** evidence that argues against it
   - **Test:** the minimal experiment that would prove or disprove it
3. Mark the **ROOT HYPOTHESIS** — the one with supporting evidence and
   no conflicting evidence. If multiple qualify, pick the easiest to test.
4. Write everything to `DEBUG.md` under `## Hypotheses`.

**Example format in DEBUG.md:**

```markdown
## Hypotheses

### H1: Race condition in session middleware (ROOT HYPOTHESIS)
- Supports: only happens under concurrent requests, timing-dependent
- Conflicts: none yet
- Test: add mutex lock around session read, check if bug disappears

### H2: Stale cache returning expired token
- Supports: works after restart (cache cleared)
- Conflicts: cache TTL is 5min, bug appears within 30s
- Test: disable cache, reproduce

### H3: Wrong env variable in CI
- Supports: works locally, fails in CI
- Conflicts: env diff shows identical values
- Test: print actual runtime value in CI logs
```

**Exit criteria.**

- [ ] At least 3 hypotheses written
- [ ] Each has supporting/conflicting evidence
- [ ] Each has a specific, minimal test
- [ ] ROOT HYPOTHESIS identified
- [ ] All written to `DEBUG.md`

---

## Phase 3: EXPERIMENT

**Goal.** Test the ROOT HYPOTHESIS with the smallest possible change.
You are a scientist — you are trying to **falsify**, not confirm.

**Steps.**

1. Write the experiment before running it. What will you change? What
   result confirms the hypothesis? What result rejects it?
2. Make the change. **Maximum 5 lines.** If you need more, your hypothesis
   is too vague.
3. Run the reproduction from Phase 1.
4. Record the result in `DEBUG.md` under `## Experiments`.

**Experiment rules.**

- One variable at a time. Do not combine two fixes "to save time."
- Do not write production fix code. Write diagnostic code: log statements,
  assertions, simplified logic, hardcoded values.
- Revert the experiment after recording results. Keep the tree clean.
- If the experiment is inconclusive, that's a result — record it and
  test the next hypothesis.

**Exit criteria.**

- [ ] Experiment executed (one change, one variable)
- [ ] Result recorded: confirmed, rejected, or inconclusive
- [ ] Experimental code reverted
- [ ] Results written to `DEBUG.md`

---

## Phase 4: CONCLUDE

**Goal.** Confirm root cause, write the real fix, and add a regression test.

**Steps.**

1. If ROOT HYPOTHESIS confirmed:
   - Write the **root cause** in one sentence in `DEBUG.md`.
   - Now — and only now — write production fix code.
   - Add a regression test that fails without the fix and passes with it.
   - Commit fix and test together.
2. If ROOT HYPOTHESIS rejected:
   - Record the rejection and evidence in `DEBUG.md`.
   - Promote the next hypothesis to ROOT. Return to Phase 3.
   - If all hypotheses rejected, return to Phase 1 with new observations.
3. Update `DEBUG.md` with the final `## Root Cause` and `## Fix` sections.

**Exit criteria.**

- [ ] Root cause identified and written in one sentence
- [ ] Fix committed
- [ ] Regression test committed
- [ ] `DEBUG.md` complete with full investigation trail
- [ ] Original reproduction case now passes

---

## Anti-Bulldozer Rule

The #1 failure mode of AI debugging: the agent forms a theory, writes 150
lines of "fix" code, it doesn't work, so it writes another 150 lines going
deeper into the same wrong theory.

**This skill exists to prevent that.** If you catch yourself or the agent:

- Writing more than 5 lines before confirming a hypothesis → STOP. Back to Phase 2.
- Trying the same approach a second time → STOP. The hypothesis is rejected. Next one.
- Ignoring conflicting evidence → STOP. Write it down. Re-rank hypotheses.
- Feeling "almost there" after 3 failed attempts → STOP. You are bulldozing.

Write it down. Test it. Prove it. Then fix it.