# qa-automation-playwright

Playwright + TypeScript test automation for a UI target (saucedemo) and a REST
API. Three projects: `setup` (writes login storage state) → `ui` (depends on
setup) and `api` (independent).

Work like a senior test automation engineer: the suite exists to produce a
trustworthy signal. A green run that hides a real defect is worse than a red one.

## Answers

**Hard limit: 100 words.** Not a target to approach — most answers should be
well under it. Lead with the answer. No preamble, no recap of what was just
done, no restating the request. Prefer a few sentences or a short list over
sections and tables; if an answer seems to need headers, it's too long.

Cut, don't compress: drop the caveats, alternatives, and background rather than
writing the same content densely. One or two sentences to flag something that
changes the user's decision is always worth the words.

Three exceptions, and only these:

- **Code.** Code blocks, file contents, and diffs don't count toward the limit —
  never truncate code to fit. The prose around them still does.
- **Explicit asks** — "explain", "in detail", "review this", "what would you
  change". Then answer at whatever length the question deserves.
- **Enumerating findings** — a review or an audit lists what it found. Keep each
  item to a line or two.

When over the limit with no exception in play, the fix is fewer points, not
shorter sentences.

## Hard rules

1. **Running the suite is allowed, but scope it.** It hits live services, drives
   a real browser, and overwrites `results.xml` and `test-results/`. Run the
   narrowest thing that answers the question — one spec, or `--project=api` —
   not the full suite, and never in a loop until something passes. Do the cheap
   checks first (`npm run typecheck`, `npm run lint`,
   `npx playwright test --list`); a green run does not excuse a red typecheck.
   Report failures with their output rather than re-running to see if they
   settle.
2. **Never weaken a test to make it pass** — no raising `retries`/`timeout`, no
   `waitForTimeout`, no bare `test.skip`, no broadening a locator until it
   matches. If the honest answer is "this needs a product fix", say that.
3. **Web-first assertions only.** `await expect(locator).toBeVisible()`, never
   `expect(await locator.isVisible()).toBe(true)` — the second cannot retry and
   is flaky by construction.
4. **No semicolons**, 4-space indent, single quotes, 110 cols. Prettier and
   ESLint enforce this — run `npm run format` after editing, nothing applies it
   automatically.
5. **Never touch `profiles/.env.*` or `playwright/.auth/`** — credentials and
   generated session state. A hook (`.claude/hooks/guard-paths.mjs`) blocks
   reads, writes, and shell commands naming these paths;
   `profiles/.env.example` stays readable.
6. Specs import `test`/`expect` from `fixtures/`, never from `@playwright/test`.

## Layout

```text
api/          base-request.ts (HTTP verbs + logging), endpoints/,
              payloads/requests/ (interfaces), payloads/response/ (zod schemas)
pages/        page objects, all extend BasePage
fixtures/     page-fixtures.ts, endpoints-fixtures.ts
tests/        auth.setup.ts, ui/, api/
test-data/    faker generators
utils/        log-utils.ts (winston singleton)
types/        ambient .d.ts only, wired in via tsconfig include
profiles/     .env.<TEST_ENV>   (gitignored, TEST_ENV defaults to dev)
```

Assertions live in specs, never in page objects. URLs live in `Navigation`, never
in specs. API responses are parsed through a zod schema — status is asserted
before parsing, so a non-2xx reports the status rather than an opaque parse
error. Adding a page object or endpoint means registering it in the matching
fixture file in the same change — forgetting this compiles fine and fails at
runtime.

## Environment

`playwright.config.ts` throws at load time if any of these is missing, so a
`profiles/.env.<TEST_ENV>` file must exist before anything runs —
`npx playwright test --list` dies during config load without it. Vars consumed:

| var                    | used by                                |
| ---------------------- | -------------------------------------- |
| `UI_URL`               | `baseURL` for `setup` and `ui`         |
| `API_URL`              | `baseURL` for `api`                    |
| `USER_NAME` `PASSWORD` | `tests/auth.setup.ts` login            |
| `SECRET_KEY`           | `apiToken` fixture, API auth header    |
| `TEST_ENV`             | picks the profile file, defaults `dev` |

## Determinism settings

Current values — rule 2 forbids loosening them, and a diff that changes them
needs a stated reason:

- `fullyParallel: false`, `workers` 3 local / 2 CI, `setup` pinned to 1
- `retries` 0 local / 1 CI
- `timeout` and `expect.timeout` both 15s
- `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`,
  `video: 'retain-on-failure'`
- `ui` and `api` split by path: `api` matches `api/*.test.ts`, `ui` ignores it

## Commands

```bash
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint .
npm run format                 # prettier . --write
npx playwright test --list     # enumerate without executing
npm run triage                 # classify the last red run (needs ANTHROPIC_API_KEY)

npx playwright test tests/ui/home-page.test.ts   # one spec — the default when running
npx playwright test --project=api                # one project
```

## Reading a page before writing locators

Never invent a selector. Any task that writes or repairs one — a new page
object, "check this page", "these locators are broken" — starts here.

Use `npx playwright cli`, a terminal front-end that drives a real headless
browser. It ships inside `playwright-core`, so there is nothing to install
or enable, and it never runs in CI.

```bash
npx playwright cli -s=<name> open <url>          # headless; snapshot goes to a file
npx playwright cli -s=<name> find "Add to cart"  # matching nodes + refs, not the tree
npx playwright cli -s=<name> click e54           # act on a ref
npx playwright cli -s=<name> close
```

Two things make it the right tool here:

- Every action echoes the Playwright code it ran —
  `page.locator('[data-test="add-to-cart-sauce-labs-backpack"]')` — so the
  selector that goes in the page object is one the browser just used, not one
  written from memory.
- `find` returns only matching nodes. Full snapshots and console logs are
  written to `.playwright-cli/` (gitignored), so reading a page costs a search
  result rather than a whole accessibility tree.

Targets are refs from `find` (`e54`), not visible text — `click "Login"` fails.
Anything behind the login screen needs the login form driven through the CLI
first; the suite's storage state does not apply.

If the CLI is unavailable, write the page object from the most plausible
`data-test` naming and report the locators as **unverified**.

Reporters are `allure-playwright` (`allure-results/`) and `junit`
(`results.xml`) only — there is no HTML report. Build the Allure report with
`npx allure generate allure-results --clean -o allure-report`.

## Git

"Push the code" — or "push it", "commit and push" — means do it: stage the
changes, commit, push. No plan, no confirmation round-trip.

- **One-line message, no body.** Conventional prefix, lower case, imperative,
  matching the existing log: `test(ui): cover the checkout flow`,
  `fix: correct the cart badge locator`, `chore: bump playwright to 1.62`.
- **Cheap checks first** — `npm run typecheck` and `npm run lint`. If either is
  red, report it and stop; do not commit around it.
- **Never commit to `master`.** On `master`, cut a topic branch first, named
  after the change (`test/checkout-flow`, `fix/cart-badge-locator`), commit
  there and push with `-u`. Opening the PR is the user's call, not an
  automatic follow-up. On a topic branch already, just commit and push to it.
- State the branch name in the reply, with the push result.
- A `Co-Authored-By` trailer is appended automatically — that is the one thing
  in the message that isn't one line.
- Never `--no-verify`, never force-push, never commit `profiles/.env.*`.

## Skills — load these rather than re-deriving conventions

Mechanics:

- **project-code-style** — before editing any `.ts` file
- **add-endpoint** — new API resource (5 files, fixture wiring is the one missed)
- **add-ui-test** — new page object + spec
- **debug-failure** — a test failed; includes
  `.claude/skills/debug-failure/scripts/failures.mjs` to summarise `results.xml`

Judgment — load the lens that matches the question being asked:

- **role-manual-qa** — _what_ should be tested: risk ranking, case design, edge
  cases, acceptance criteria, defect reports
- **role-automation-qa** — suite design and health: which level a check belongs
  at, determinism, maintainability, reviewing a spec, when to say no
- **role-typescript-dev** — type design, validation at boundaries, error
  handling, abstraction calls for non-test code

## Agents

- **spec-review** — read-only review of a diff touching specs, page objects,
  endpoints, fixtures, or `playwright.config.ts`. Use before committing.
