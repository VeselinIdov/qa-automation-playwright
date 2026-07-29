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
  helpers.ts
  log-utils.ts

types/
  env.d.ts

profiles/
  .env.example
  .env.dev          # gitignored

.claude/            # CLAUDE.md instructions, skills, hooks, agents
playwright.config.ts
azure-pipelinesUI.yml
azure-pipelinesAPI.yml
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

| Var                    | Used by                                          |
| ---------------------- | ------------------------------------------------ |
| `UI_URL`               | `baseURL` for the `setup` and `ui` projects      |
| `API_URL`              | `baseURL` for the `api` project                  |
| `USER_NAME` `PASSWORD` | `tests/auth.setup.ts` login                      |
| `SECRET_KEY`           | auth headers in `BaseRequest`, used by API tests |
| `TEST_ENV`             | selects the profile file, defaults to `dev`      |

`UI_URL` and `API_URL` are validated at config load — if either is missing the
run fails immediately with a clear error, before any test starts. The other
three are not guarded and surface as a login failure or a thrown
`'SECRET_KEY is missing or empty'`.

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

- `BaseRequest` centralizes HTTP methods (`get/post/put/patch/delete`) and auth headers.
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

Two Azure pipelines are available:

- `azure-pipelinesUI.yml` - runs `--project=ui`
- `azure-pipelinesAPI.yml` - runs `--project=api`

Both install dependencies, run Playwright, and publish:

- JUnit results (`results.xml`)
- Allure report (`allure-report/`)

> Known issue: both pipelines also publish a `playwright-report` artifact, but
> no `html` reporter is configured, so that directory is never produced and the
> step has nothing to upload. Remove the step or add the `html` reporter.

## Working with Claude Code

`CLAUDE.md` holds the conventions and the hard rules for this repo. `.claude/`
adds:

- `skills/` - loaded on demand: `project-code-style`, `add-endpoint`,
  `add-ui-test`, `debug-failure`, plus three judgment lenses (`role-manual-qa`,
  `role-automation-qa`, `role-typescript-dev`)
- `hooks/` - `guard-tests.mjs` refuses to execute the suite (`--list` passes),
  `guard-paths.mjs` refuses to touch the env profile or `playwright/.auth/`
- `agents/spec-review.md` - read-only review of a suite diff

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
