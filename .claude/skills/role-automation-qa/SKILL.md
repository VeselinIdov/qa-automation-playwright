---
name: role-automation-qa
description: The senior automation engineer lens — judgment about suite design and health rather than file mechanics. Use when reviewing existing specs, deciding at which level a check belongs, judging whether something should be automated at all, assessing flakiness or suite maintainability, or setting tagging and CI strategy. For the how-to of adding files, use add-ui-test or add-endpoint instead.
---

# Senior automation engineer lens

The suite's job is a trustworthy signal. Every decision below serves that: a test
that can fail for a reason other than the defect it targets is worse than no test.

## Choose the level before writing anything

Same check, cheapest reliable level wins:

| Question                                             | Level                |
| ---------------------------------------------------- | -------------------- |
| Does the API return the right data / status / shape? | API test             |
| Does the UI render and react correctly to that data? | UI test              |
| Does a full business flow hold end to end?           | One UI test, not ten |

A UI test that exists to verify server-side logic is a slow, flaky proxy for an
API test. In this repo the `api` project runs in ~2s with no browser; the `ui`
project needs `setup`, a browser, and a real site. Push checks down.

Also push _up_ when appropriate: a locator-brittleness or type problem belongs in
ESLint or `tsc`, not a test.

## Determinism is non-negotiable

A test must fail only for its own reason. Before accepting a spec, ask:

- **Does it depend on order?** If it needs another test to have run, it's broken.
  This repo has `fullyParallel: false` globally with `mode: 'parallel'` opted into
  per file — a file that opts in must be genuinely independent.
- **Does it share mutable state?** Every UI test loads the same
  `playwright/.auth/user.json`, and saucedemo's cart lives in `localStorage`.
  Anything mutating the cart affects its neighbours.
- **Does it own its data?** Prefer generated data (`test-data/` faker helpers)
  over fixed IDs. Where a shared fixed record is unavoidable — `posts/1` here —
  only read it, never mutate it in a test that others depend on.
- **Does it clean up?** Prefer arranging fresh state over undoing state, since
  cleanup doesn't run when a test crashes mid-way.
- **Any real clock or sleep?** No `waitForTimeout`. Web-first assertions retry;
  the 15s `expect` timeout is the wait.

## Assertions

- Assert the **one behaviour** named in the test title. A test asserting six
  unrelated things reports one failure and hides five.
- Assert the **observable outcome**, not the implementation. "Cart badge shows 1"
  beats "localStorage key `cart-contents` has length 1".
- Prefer **web-first, retrying** assertions:
  `await expect(locator).toHaveCount(2)` not
  `expect(await locator.count()).toBe(2)`. The second cannot retry and is flaky
  by construction — this is the single most common self-inflicted flake.
- Validate API responses through the zod schema
  (`deserializePostResponse`) so a contract change fails loudly and precisely
  rather than as a downstream `undefined`.
- Assert status **and** payload. A 200 with the wrong body still passes a
  status-only test.

## Maintainability

The cost of a suite is paid at every UI change, not at write time.

- **One locator, one place.** A selector appearing in two files is a future
  two-file fix. Locators live in page objects.
- **Specs read as intent.** A reviewer who doesn't know the app should follow the
  spec. Mechanics belong behind page-object method names (`checkout()`, not four
  clicks inline).
- **Don't abstract on the first repeat.** A `BasePage` earning its place is fine;
  a five-level page hierarchy to save two lines is not.
- **Delete tests that no longer carry signal.** A test that never fails, or one
  everybody ignores because it's flaky, is a liability. Say so.
- **Tags are a contract.** `@smoke` = the load-bearing check for a screen, must
  be fast and must never be flaky. `@ui` / `@api` scope a run. Tagging everything
  `@smoke` makes the tag useless.

## Reviewing a spec — what to flag

Ordered by severity:

1. Non-retrying assertion (`expect(await …isVisible())`) — flaky by construction
2. Missing `await` on a Playwright call — silent false pass;
   `@typescript-eslint/no-floating-promises` catches it, so a lint error here is
   never cosmetic
3. Hard wait (`waitForTimeout`) or `waitForLoadState('networkidle')`
4. Brittle locator: XPath, structural CSS (`div > div:nth-child(3)`), a CSS class
   chain, or text matching dynamic content
5. Order dependence or shared mutable state
6. Assertion inside a page object, or `page.goto` inside a spec
7. Test asserting several unrelated behaviours
8. Locator duplicated outside a page object
9. Title that doesn't describe the behaviour

## Flakiness has a cause, always

Treat "flaky" as undiagnosed, not as a category of test. Reproduce, find the
mechanism, name it: race with a re-render, shared state, order dependence,
non-retrying assertion, real network. Then fix the mechanism.

Raising `retries`, adding a sleep, or wrapping in `try/catch` converts a known
problem into an unknown one. Push back if asked to do that — including by a
pipeline being red and someone wanting it green. See the **debug-failure** skill
for the diagnostic path.

## CI strategy

- Retries exist to **absorb** infrastructure noise, not to hide test defects.
  `retries: 1` on CI and 0 locally is the right shape; a test needing the retry to
  pass is a bug report, not a pass.
- Artifacts must be enough to diagnose without re-running: trace, screenshot,
  video, JUnit XML. Note `trace: 'on-first-retry'` means **no trace locally**,
  where retries are 0.
- Worker count changes ordering. CI runs 2 workers and local 3, so CI surfaces
  isolation bugs that hide locally. That's a feature.
- A red pipeline must be diagnosable by someone who didn't write the test. If
  the failure output doesn't say what broke, that's a suite defect.

## When to say no

Say plainly, with the reason:

- **Don't automate it yet** — the flow changes weekly; maintenance exceeds value.
- **Don't automate it here** — that's a unit test, or an ESLint rule, or a monitor.
- **Don't automate it at all** — visual taste, or a one-off migration check.
- **This can't be tested meaningfully** — jsonplaceholder is a mock that accepts
  invalid input and fakes writes, so a negative API test there asserts nothing.
- **This is a product bug** — the fix isn't in the test.

Coverage counts and pass rates are not the goal. Defects caught, and confidence
that a green run means something, are.
