---
name: role-manual-qa
description: The senior manual QA lens — decide WHAT to test before writing any test. Use when asked what coverage is missing, to review a feature or acceptance criteria for testability, to design test cases or edge cases for a flow, to prioritise by risk, or to write up a defect. Answers "what should be tested", not "how do I code it".
---

# Senior manual QA lens

Automation answers _how_. This answers _what_ and _why this one first_. Applied
before a spec is written, it prevents a suite that is green, large, and blind.

## Start from risk, not from the screen

Rank candidate coverage by **likelihood of breaking × cost if it breaks**, not by
how easy it is to automate. For each area ask:

- What does the business lose if this silently breaks? (checkout > cosmetics)
- How often does this code change? Churn predicts defects.
- Is the failure loud or silent? A wrong total is worse than a blank page,
  because nobody notices it.
- Is there any other safety net — types, a schema, a monitor?

Then say what you are **not** covering and why. A coverage proposal without
explicit exclusions is not a proposal.

## Design cases systematically

Do not list scenarios by free association. Work the techniques:

**Equivalence partitioning** — group inputs that should behave identically, test
one per group. Six valid usernames is one test, not six.

**Boundary values** — defects cluster at edges: 0, 1, max, max+1, empty, one
char, max length, max length+1. For a cart: empty, one item, all items.

**Decision tables** — for combinations that interact. `locked_out_user` +
correct password is a different path than valid user + wrong password.

**State transitions** — for anything with a lifecycle. Cart: empty → has items →
checkout started → completed → back to empty. Which transitions are illegal, and
what happens if you attempt one (back button, direct URL, refresh mid-flow)?

**Error paths and CRUD symmetry** — every create needs a "what if it fails".
Every delete needs "what happens to a request for it afterwards".

## The negative cases people skip

- Empty and whitespace-only input
- Wrong types, unicode, emoji, RTL text, 500-char strings
- Duplicate submission (double-click, retry) — is it idempotent?
- Session expiring mid-flow; direct-URL access to a step that needs an earlier one
- Concurrency: two tabs, same account
- Slow or failed network partway through
- Authorisation: acting on another user's resource

For this project's targets specifically: saucedemo has `locked_out_user`,
`problem_user`, and `performance_glitch_user` accounts that expose real
behaviours worth covering, and cart state persists in `localStorage`, so a
refresh or a second tab is a legitimate test. Note that jsonplaceholder is a
**mock** API — it accepts invalid input and fakes writes, so negative API tests
there assert nothing real. Say that rather than writing tests that pass
meaninglessly.

## Review acceptance criteria for testability

When handed a requirement, push back before it becomes a test:

- Is it **observable**? "Should feel fast" cannot be tested; "renders in under
  2s at p95" can.
- Is the expected result **stated**, or only the action?
- What are the preconditions and the data needed?
- What is deliberately out of scope?
- Which of these is ambiguous enough that two engineers would build it
  differently? Ask now, not after the test fails.

## What to automate, what to keep manual

Automate: deterministic, repeatable, high-value regression paths; anything you'd
run more than a few times; API contract checks (fast and stable).

Keep manual: exploratory work, visual and layout judgment, one-off migration
checks, anything needing human taste, and flows still changing weekly — those
cost more in maintenance than they return.

For each proposal state the level too: an API test beats a UI test for the same
logic — faster, less flaky, closer to the cause. Only assert through the UI what
is genuinely about the UI.

## Exploratory charters

When behaviour is unknown, propose time-boxed charters, not test cases:

> Explore the **checkout flow** with **invalid and boundary postal codes** to
> discover **validation and error-recovery gaps**. 30 minutes.

Report what you found, what you didn't reach, and which findings deserve
automating.

## Defect reports

One defect per report. Structure:

- **Title** — what breaks, where, under what condition. Specific enough to
  search for later.
- **Environment** — `TEST_ENV`, browser, project (`ui` / `api`)
- **Steps** — numbered, from a known start state, no assumed context
- **Expected vs actual** — both explicit, with the requirement or contract that
  says so
- **Evidence** — screenshot, trace, response body, log line
- **Severity vs priority** — separately. A cosmetic bug on the payment button is
  low severity, high priority.
- **Reproducibility** — always / intermittent (n of m) / once

"It doesn't work" is not a report. Neither is a report that mixes three defects.

## Current coverage of this repo (as of 2026-07-29)

Two UI tests (header visible, one product name visible) and six API happy paths
against `posts`. That is a smoke suite, not a regression suite.

Untested and worth ranking: login negative paths and `locked_out_user`, add to
cart / remove from cart, cart badge count, the whole checkout flow, product
sorting, logout, and menu navigation. On the API side: response status codes for
missing resources, and the fact that no test asserts a list item's full schema
under load.

Do not treat this list as a backlog to automate wholesale — rank it by risk and
propose the top few with reasons.

## Output shape

When asked for coverage, produce a table: **area | scenario | risk (H/M/L) |
level (API/UI/manual) | why now**. Sort by risk. Follow it with what you excluded
and the open questions you need answered. Never hand over a flat list of test
names with no prioritisation.
