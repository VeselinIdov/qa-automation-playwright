# Playwright Test Automation Framework (TypeScript)

Lightweight Playwright framework for UI and API automation with:

- Playwright projects (`setup`, `ui`, `api`)
- Page fixtures and API endpoint fixtures
- API request abstraction (`BaseRequest`)
- Faker-based API test data
- Zod response parsing
- Allure + JUnit reporting

## Tech Stack

- TypeScript
- Playwright (`@playwright/test`)
- Faker (`@faker-js/faker`)
- Zod
- ESLint + Prettier
- Allure reporter

## Prerequisites

- Node.js `^20.19.0 || ^22.13.0 || >=24` (see `engines` in `package.json`)
- npm (or yarn/pnpm)

## Installation

```bash
npm install
npx playwright install
```

## Project Structure

```text
api/
  base-request.ts
  endpoints/
    posts-endpoint.ts
  payloads/
    requests/
      post-payloads.ts
    response/
      post-response.ts

fixtures/
  page-fixtures.ts
  endpoints-fixtures.ts

pages/
  base-page.ts
  login-page.ts
  home-page.ts
  navigation.ts

tests/
  auth.setup.ts
  ui/
    home-page.test.ts
  api/
    posts-api.test.ts

test-data/
  posts-test-data.ts

utils/
  log-utils.ts

types/
  env.d.ts

profiles/
  .env.example
  .env.dev          # gitignored

.azure/
  playwright-job.yml    # shared CI job, both pipelines extend it
  scripts/
    triage-failures.mjs # classifies a red run, posts to the build summary

.claude/                # CLAUDE.md instructions, skills, hooks, agents
.mcp.json               # Playwright MCP server, for reading live markup
playwright.config.ts
azure-pipelinesUI.yml
azure-pipelinesAPI.yml
.gitattributes
```

Generated at runtime and gitignored: `allure-results/`, `allure-report/`,
`test-results/`, `logs/`, `results.xml`, `playwright/.auth/`.

## Environment Configuration

The framework uses profile-based env files:

- `profiles/.env.dev`
- optionally more profiles like `.env.staging`, `.env.prod`

`playwright.config.ts` loads the profile based on `TEST_ENV`, defaulting to
`dev`:

```bash
TEST_ENV=dev
```

Copy `profiles/.env.example` to `profiles/.env.<TEST_ENV>` and fill it in. That
file is gitignored — never commit real values.

### Required env vars

| Var                    | Used by                                     |
| ---------------------- | ------------------------------------------- |
| `UI_URL`               | `baseURL` for the `setup` and `ui` projects |
| `API_URL`              | `baseURL` for the `api` project             |
| `USER_NAME` `PASSWORD` | `tests/auth.setup.ts` login                 |
| `SECRET_KEY`           | `apiToken` fixture → API auth header        |
| `TEST_ENV`             | selects the profile file, defaults to `dev` |

All five are validated at config load — if one is missing the run fails
immediately with an error naming the variable and the profile file, before any
test starts. A _wrong_ value is not caught: a bad `PASSWORD` fails `setup`, a bad
`SECRET_KEY` shows up as 401s in the `api` project.

## Playwright Projects

Defined in `playwright.config.ts`:

- `setup` - runs `tests/auth.setup.ts` and creates storage state
- `ui` - runs UI tests, depends on `setup`
- `api` - runs API tests under `tests/api/`

## Running Tests

### All tests

```bash
npm test
```

### UI only

```bash
npm run test:ui
```

### API only

```bash
npm run test:api
```

### Headed mode

```bash
npm run test:headed
```

### By tag

Specs are tagged `@smoke`, `@ui` and `@api`:

```bash
npx playwright test --grep @smoke
npx playwright test --grep-invert @api
```

### List without executing

```bash
npx playwright test --list
```

### Build the Allure report

There is no HTML reporter configured — the reporters are `allure-playwright`
(`allure-results/`) and `junit` (`results.xml`).

```bash
npm run report
```

## Lint / Format / Typecheck

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
```

### Recommended local quality flow

```bash
# 1) Check lint issues
npm run lint

# 2) Auto-fix lint issues where possible
npm run lint:fix

# 3) Keep formatting consistent
npm run format

# 4) Verify formatting only (CI-like check)
npm run format:check

# 5) Validate TypeScript
npm run typecheck
```

## Allure Reporting

Allure raw results are generated automatically by Playwright in `allure-results/`.

### Generate Allure HTML report

```bash
npx allure generate allure-results --clean -o allure-report
```

### Open Allure report locally

```bash
npx allure open allure-report
```

### One-liner (generate and open)

```bash
npx allure generate allure-results --clean -o allure-report && npx allure open allure-report
```

### Typical local sequence

```bash
# Run tests first (example: API project)
npx playwright test --project=api

# Build and open Allure report
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report
```

## Fixtures

Specs import `test` and `expect` from `fixtures/`, never from
`@playwright/test`. A new page object or endpoint class must be registered in
the matching fixture file in the same change — skipping that compiles cleanly
and fails at runtime.

### UI fixtures

`fixtures/page-fixtures.ts` exposes:

- `loginPage`
- `homePage`
- `navigation`

### API fixtures

`fixtures/endpoints-fixtures.ts` exposes:

- `postsEndpoint` (instance of `PostsEndpoint`)

## API Layer

- `BaseRequest` centralizes HTTP methods (`get/post/put/patch/delete`) and request logging.
  Auth is not threaded through calls — the `authedRequest` fixture builds an
  `APIRequestContext` carrying `Authorization` and `Content-Type`, and every endpoint
  hangs off it.
- The token comes from the worker-scoped `apiToken` fixture, which reads
  `SECRET_KEY` today. If your API issues tokens from a login endpoint, replace that
  one fixture body with the call — endpoints, specs and config stay untouched, and
  worker scope means one login per worker rather than one per test.
- `PostsEndpoint` contains post-specific API methods:
    - `getPost`
    - `getPosts`
    - `createPost`
    - `updatePost`
    - `patchPost`
    - `deletePost`

Responses are parsed through a Zod schema, and the status is asserted before
parsing so a non-2xx reports the status rather than an opaque parse error.

## API Test Data

`test-data/posts-test-data.ts` provides Faker helpers:

- `randomUserId()`
- `randomTitle()`
- `randomBody()`

## CI/CD

Two Azure pipelines, both thin entry points over one shared job definition in
`.azure/playwright-job.yml`:

- `azure-pipelinesUI.yml` - `project: ui`, installs browsers
- `azure-pipelinesAPI.yml` - `project: api`, skips the browser download

The shared job runs `lint`, `typecheck` and `format:check` before the suite, so a
formatting or type error fails in seconds instead of after a browser run. It then
publishes JUnit results (`results.xml`) and the Allure report, plus
`test-results/` (traces, screenshots, videos) when something fails.

### Failure triage

When a run goes red, `.azure/scripts/triage-failures.mjs` summarises `results.xml`
through `.claude/skills/debug-failure/scripts/failures.mjs`, attaches up to three
failure screenshots, and asks Claude to classify each failure as **REAL BUG**,
**STALE TEST**, **FLAKE**, or **INFRA** using the `debug-failure` skill as the
rubric. The verdict is written to `triage.md` and attached to the Azure build
summary page.

It interprets a red run — it never changes one. It does not execute the suite,
edit a spec, or affect the build result: the step is `condition: failed()` +
`continueOnError: true`, and the script always exits 0. It skips itself when
`ANTHROPIC_API_KEY` is unset, so the pipeline works unchanged without it.

Run it locally against the last run with `npm run triage`.

### Pipeline variables

The env profile is gitignored, so CI has no profile file to read. Supply the five
required vars as pipeline variables or a variable group — mark `PASSWORD` and
`SECRET_KEY` secret:

```text
TEST_ENV  UI_URL  API_URL  USER_NAME  PASSWORD  SECRET_KEY
```

`dotenv` does not overwrite values already in the environment, so these win over
any profile file that happens to exist on the agent.

`ANTHROPIC_API_KEY` (secret) is optional — it only enables the failure-triage
step below. Without it that step skips itself and everything else runs unchanged.

## Using this as a template

Everything here is either **scaffolding** (keep it, it's the framework) or
**demo** (saucedemo + JSONPlaceholder, replace it with your own target).

Keep as-is:

```text
playwright.config.ts   tsconfig.json   eslint.config.mjs   .prettierrc
.gitattributes         .azure/playwright-job.yml
api/base-request.ts    pages/base-page.ts
fixtures/              utils/log-utils.ts    types/env.d.ts    .claude/
```

Replace with your own:

```text
pages/home-page.ts  pages/login-page.ts   locators are saucedemo's
pages/navigation.ts                       URLs are saucedemo's
api/endpoints/      api/payloads/         posts resource
test-data/          tests/ui/  tests/api/
tests/auth.setup.ts                       keep the storageState pattern,
                                          swap the login flow
```

Then:

1. Copy the example env profile to your own and fill in URLs and credentials.
   Every var in `REQUIRED_ENV_VARS` must be present or the config throws at load.
2. Empty the fixture types and `extend` blocks in `fixtures/`, then add your own
   page objects and endpoints back as you write them.
3. Delete the demo specs — keep one as a shape reference until your first real
   spec passes.

The `.claude/` directory is the part worth keeping verbatim: the skills encode
locator policy, layering rules, and failure triage that apply to any Playwright
project, and they're what keep an agent generating code that matches the rest of
the repo.

> Patterns verified against `@playwright/test` 1.62 and Node 22.

## Working with Claude Code

`CLAUDE.md` holds the conventions and the hard rules for this repo. `.claude/`
adds:

- `skills/` - loaded on demand: `project-code-style`, `add-endpoint`,
  `add-ui-test`, `debug-failure`, plus three judgment lenses (`role-manual-qa`,
  `role-automation-qa`, `role-typescript-dev`)
- `hooks/` - `guard-paths.mjs` refuses to read, write, or shell-touch the env
  profile or `playwright/.auth/`
- `agents/spec-review.md` - read-only review of a suite diff

`.mcp.json` wires up the [Playwright MCP server](https://github.com/microsoft/playwright-mcp)
so an agent can open the app in a real browser and read the live DOM when
writing locators, instead of guessing at `data-test` names. It is an authoring
aid — it never runs in CI.

Summarise the last run's failures with:

```bash
node .claude/skills/debug-failure/scripts/failures.mjs
```

## Notes

- Keep file names in kebab-case.
- Keep class/interface names in PascalCase.
- Keep method/fixture/function names in camelCase.
- Prefer behavior-focused test names (`should ...`).
- No semicolons, 4-space indent, single quotes, 110 columns — Prettier and
  ESLint enforce it.
- Assertions belong in specs, never in page objects. URLs belong in
  `Navigation`.
