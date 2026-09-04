---
name: debug-failure
description: Diagnose a failing or flaky Playwright test in this repo — locate the failure from results.xml, open the right trace/video/screenshot, and classify it as real bug, stale test, or flake. Use when a test fails locally or in the Azure pipeline, when a run goes red, or when asked why a test is failing.
---

# Debug a failing test

Start from the report, not from re-reading the spec. Guessing at the cause and
"fixing" the locator is how a real product bug gets papered over.

## 1. What failed

The `junit` reporter writes `results.xml` on every run. Summarise it:

```bash
node .claude/skills/debug-failure/scripts/failures.mjs
```

Prints totals, then each failure with its assertion message, the trimmed stack,
and any artifacts found in `test-results/`. Exits `1` if anything failed, so it
works in a chain. Pass a path to read a report downloaded from CI:

```bash
node .claude/skills/debug-failure/scripts/failures.mjs ~/Downloads/results.xml
```

## 2. Artifacts

`playwright.config.ts` captures, per failing test:

| Setting      | Value               | Means                          |
| ------------ | ------------------- | ------------------------------ |
| `trace`      | `on-first-retry`    | **Only exists if a retry ran** |
| `screenshot` | `only-on-failure`   | Always there for a failure     |
| `video`      | `retain-on-failure` | Always there for a failure     |

Everything lands in `test-results/<slugified-test-name>/`.

```bash
npx playwright show-trace test-results/<dir>/trace.zip
```

**The trace gap matters.** `retries` is `process.env.CI ? 1 : 0` — locally there
are no retries, so a local failure produces **no trace**. To get one, re-run that
spec with retries on:

```bash
npx playwright test tests/ui/home-page.test.ts --retries=1
```

There is no `playwright show-report` script — the `html` reporter isn't
configured, only `allure-playwright` and `junit`. For a browsable report use
Allure (`npm run report` generates it):

```bash
npx allure generate allure-results --clean -o allure-report && npx allure open allure-report
```

For API failures there's no trace to open; the winston log is the record. Console
output plus `logs/app-*.log` shows which request was sent
(`Sending GET request to: posts/1`). A zod `.parse()` failure prints the exact
path and expected type — that's a contract change, not a test bug.

## 3. Reproduce

**Read the artifacts on disk first.** A reproduction costs a live run and
overwrites `results.xml` and `test-results/` — the evidence you are standing on.
Reach for one only when the artifacts genuinely can't answer the question.

When you do reproduce, run the narrowest command that tests your hypothesis, and
say what its result will tell you before you run it. `--repeat-each` and
full-directory runs are expensive; ask before those rather than defaulting to
them.

```bash
# does it fail consistently?
npx playwright test <file> --repeat-each=5 --workers=1

# does it only fail alongside others? -> shared state
npx playwright test tests/ui --workers=1
npx playwright test tests/ui --workers=3

# watch it happen
npx playwright test <file> --headed --debug
```

Pick the one command that answers your specific question and explain what its
result will tell you — don't hand over a menu.

If it passes serially and fails in parallel, suspect shared state before
suspecting timing. `fullyParallel` is `false` globally, but
`tests/ui/home-page.test.ts` opts into `mode: 'parallel'`, and every UI test
shares one `playwright/.auth/user.json` storage state — so anything mutating
saucedemo's cart leaks between tests in that file.

## 4. Classify

Exactly one of:

- **REAL BUG** — the app changed behaviour, the test is correct. Do not touch
  the test. Report the failing assertion, expected vs actual, and the trace
  path.
- **STALE TEST** — the app changed intentionally (renamed label, new markup) and
  the test encodes the old truth. Update the locator or assertion, and say what
  changed so the intent gets confirmed.
- **FLAKE** — passes on retry; a timing, ordering, or isolation problem. Fix the
  cause.
- **INFRA** — env var missing, browsers not installed, API unreachable, auth
  setup failed. Fix the environment, don't touch the test.

State the classification explicitly. "Fixed the test" without one of these
labels hides which of the four actually happened.

## 5. Common causes here

**Setup failed, so every UI test fails.** The `ui` project depends on `setup`.
If `tests/auth.setup.ts` can't log in, `playwright/.auth/user.json` is stale or
missing and everything downstream fails on the wrong screen. When _all_ UI tests
are red, check the `setup` result in the report first — and if it needs a re-run,
`npx playwright test --project=setup` regenerates the storage state.

**Browsers not installed.** Fails instantly with an executable-not-found path
under `ms-playwright`. `npx playwright install`.

**Missing env var.** `playwright.config.ts` throws before any test runs if any of
`UI_URL`, `API_URL`, `USER_NAME`, `PASSWORD`, `SECRET_KEY` is absent from
`profiles/.env.${TEST_ENV}` — the whole run dies at load, which reads like a
config error rather than a test failure. A _wrong_ (rather than missing) value
isn't caught: a bad `PASSWORD` fails `setup` at the Products assertion, and a bad
`SECRET_KEY` shows up as 401s across the `api` project.

**15s timeout.** Both test and `expect` timeouts are 15000ms. A timeout on a
visibility assertion usually means a wrong locator or an unexpected screen — not
a slow app. Check the failure screenshot before assuming you need more time.

**Non-retrying assertion.** `expect(await locator.isVisible()).toBe(true)`
snapshots once and cannot retry. Rewrite as
`await expect(locator).toBeVisible()`. This is the most common self-inflicted
flake in a Playwright suite.

**CI-only failure.** CI runs 2 workers vs 3 locally, `retries: 1`, and
`CI: 'true'` makes `playwright/no-skipped-test` an error. Different worker count
changes ordering, which surfaces isolation bugs that hide locally. Reproduce
by asking the user to run `CI=true npx playwright test --workers=2`.

## 6. Fixes that are not fixes

Do not do these to make a run green, and push back if asked to:

- raising `retries` or `timeout`
- adding `waitForTimeout`
- `test.skip` / `test.fixme` without a linked reason — `no-skipped-test` is an
  error in CI, deliberately
- wrapping a flaky block in `try/catch`
- broadening a locator until it matches something

Each hides the signal the suite exists to produce. If the honest answer is "this
needs a product fix," say that.

## Report back

- classification (one of the four)
- the failing assertion: expected vs actual
- root cause, not just the symptom
- what you changed, or what you're recommending if the fix isn't yours to make
- artifact paths so it can be checked independently
