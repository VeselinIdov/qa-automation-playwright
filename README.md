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

- Node.js `>=20`
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
    api/
      posts-test-data.ts

profiles/
  .env.dev

playwright.config.ts
azure-pipelinesUI.yml
azure-pipelinesAPI.yml
```

## Environment Configuration

The framework uses profile-based env files:

- `profiles/.env.dev`
- optionally more profiles like `.env.staging`, `.env.prod`

`playwright.config.ts` loads profile based on `TEST_ENV`:

```bash
TEST_ENV=dev
```

### Required env vars

- `UI_URL`
- `API_URL`
- `USER_NAME`
- `PASSWORD`
- `SECRET_KEY` (used by API tests/auth headers)

Example (`profiles/.env.dev`):

```env
USER_NAME=standard_user
PASSWORD=secret_sauce
UI_URL=https://www.saucedemo.com/
API_URL=https://jsonplaceholder.typicode.com/
SECRET_KEY=secret
```

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

### Open HTML report

```bash
npm run test:report
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

## API Test Data

`tests/test-data/api/posts-test-data.ts` provides Faker helpers:

- `randomUserId()`
- `randomTitle()`
- `randomBody()`

## CI/CD

Two Azure pipelines are available:

- `azure-pipelinesUI.yml` - runs `--project=ui`
- `azure-pipelinesAPI.yml` - runs `--project=api`

Both install dependencies, run Playwright, and publish:

- JUnit results (`results.xml`)
- Playwright report
- Allure report

## Notes

- Keep file names in kebab-case.
- Keep class/interface names in PascalCase.
- Keep method/fixture/function names in camelCase.
- Prefer behavior-focused test names (`should ...`).

