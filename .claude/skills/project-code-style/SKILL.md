---
name: project-code-style
description: This project's code style and structural conventions for Playwright + TypeScript. Load before writing or editing any .ts file here — specs, page objects, API endpoint classes, fixtures, zod schemas, test data, or playwright.config.ts. Covers formatting, naming, layering, locator policy, assertion placement, and env handling.
---

# Code style — qa-automation-playwright

Conventions inferred from the existing code. When something here conflicts with
what you see in a file, prefer this document and mention the drift — several
files predate the current formatter settings (see **Known drift**).

## Formatting

Enforced by `.prettierrc` and `eslint.config.mjs`. Never hand-format against these:

- **No semicolons.** ESLint enforces `semi: ['error', 'never']` on top of Prettier.
- **4-space indent**, spaces not tabs.
- **Single quotes**, `printWidth: 110`, `trailingComma: 'es5'`, `endOfLine: 'lf'`.

`pages/`, `utils/` and `playwright.config.ts` are the canonical reference — they
pass Prettier as-is. Copy their shape when in doubt.

Run before handing work back:

```bash
npm run format          # write
npm run lint            # eslint .
npm run typecheck       # tsc --noEmit
```

Run these three before reaching for the suite — they are seconds, and a green
run does not excuse a red typecheck. `npx playwright test --list` enumerates
without executing and is always safe. Running the suite is allowed, but it hits
live services and drives a real browser: scope it to the spec you changed, and
leave full-suite runs to the user.

`tsconfig.json` is `strict: true` with `noImplicitAny`. No `any`, no
`@ts-ignore`. `!` non-null assertion is used sparingly and only for env vars
that `playwright.config.ts` has already validated (`tests/auth.setup.ts`).

## Naming

| Thing                        | Convention                    | Example                                  |
| ---------------------------- | ----------------------------- | ---------------------------------------- |
| Files                        | kebab-case                    | `posts-endpoint.ts`, `home-page.test.ts` |
| Classes, interfaces, types   | PascalCase                    | `PostsEndpoint`, `PostPayload`           |
| Methods, functions, fixtures | camelCase                     | `getPageHeader`, `postsEndpoint`         |
| Specs                        | `<subject>.test.ts`           | `tests/api/posts-api.test.ts`            |
| Setup                        | `<name>.setup.ts`             | `tests/auth.setup.ts`                    |
| Zod schemas                  | `<entity>Schema`              | `postSchema`                             |
| Deserializers                | `deserialize<Entity>Response` | `deserializePostResponse`                |
| Faker helpers                | `random<Field>`               | `randomTitle`                            |

API test names read as behaviour: `'should create a post'`. UI test names are
terser noun phrases: `'header visible'`. Match the neighbours in the file you're
editing rather than imposing one style on both.

## Directory layout

```text
api/
  base-request.ts               HTTP verbs + request logging
  endpoints/                    one class per resource
  payloads/requests/            plain interfaces for request bodies
  payloads/response/            zod schemas + deserializers
fixtures/                       page-fixtures.ts, endpoints-fixtures.ts
pages/                          page objects, all extend BasePage
tests/                          auth.setup.ts, ui/, api/
test-data/                      faker generators
utils/                          log-utils.ts
profiles/                       .env.<TEST_ENV>
```

New resource ⇒ four files: an interface in `payloads/requests/`, a schema in
`payloads/response/`, a class in `endpoints/`, a fixture entry in
`endpoints-fixtures.ts`.

## Page objects

Extend `BasePage`, which owns `protected page: Page`. Locators are
`private readonly` fields initialised inline off `this.page`. Expose them through
methods — never make a locator public.

```ts
export class HomePage extends BasePage {
    private readonly pageHeader: Locator = this.page
        .locator('[data-test="title"]')
        .filter({ hasText: 'Products' })

    constructor(page: Page) {
        super(page)
    }

    getPageHeader(): Locator {
        return this.pageHeader
    }

    getSectionByName(sectionName: string): Locator {
        return this.page.locator('[data-test="inventory-item-name"]').filter({ hasText: sectionName })
    }
}
```

- **Getters return `Locator`.** The spec asserts on it.
- **Actions return `Promise<void>`** and are named for the user intent
  (`login`, `navigateToHome`).
- **Dynamic locators** are methods taking a parameter, resolved with
  `.filter({ hasText })` — not string-concatenated selectors.
- **No `expect` inside a page object.** Assertions belong in the spec.
- **No `page.goto` in a spec.** URLs live in `Navigation` (`homePageURL`) or
  `BasePage.open()`.

Locator preference, strongest first: `getByRole` / `getByPlaceholder`, then
`[data-test="..."]`, then `getByText`. Never XPath, never structural CSS
(`div > div:nth-child(3)`), never a class chain.

Bare `getByText` is last for a reason — it substring-matches across the whole
page, so `getByText('Login')` also hits the credentials panel on saucedemo's
login screen. Reach for the role (`getByRole('button', { name: 'Login' })`) when
the element has one, and `data-test` when it doesn't. Where a `data-test` value
is reused across screens (`title` is `Products` on inventory, `Your Cart` on the
cart), pin it with `.filter({ hasText })` so the locator still identifies the
page.

## API layer

`BaseRequest` wraps `APIRequestContext`. Every verb logs, then returns the
request without awaiting; the endpoint class awaits.

```ts
postRequest(path: string, payload: object) {
    logger.info(`Sending POST request to: ${path}`)
    return this.api.post(path, { data: payload })
}
```

Endpoint classes extend `BaseRequest` and hold the resource path as a
`private readonly` field. Methods take only what the request needs — no `token`
parameter:

```ts
export class PostsEndpoint extends BaseRequest {
    private readonly postsPath = 'posts'

    async patchPost(postId: number, payload: Partial<PostPayload>) {
        return await this.patchRequest(`${this.postsPath}/${postId}`, payload)
    }
}
```

- PATCH takes `Partial<PostPayload>`; PUT takes the full `PostPayload`.
- **Auth is not threaded through calls.** The `authedRequest` fixture builds an
  `APIRequestContext` carrying `Authorization` and `Content-Type`, and every
  endpoint hangs off it. Not `playwright.config.ts` — a token fetched from a
  login endpoint isn't known at config load, and the fixture handles both cases.
- **The token comes from the worker-scoped `apiToken` fixture.** Static
  `SECRET_KEY` today; swapping in a login call is a change to that one fixture
  body, with no config, endpoint, or spec edits. Worker scope means one login per
  worker rather than one per test.
- A test needing a _different_ token (expired, wrong scope) builds its own
  context with `playwright.request.newContext()` rather than reintroducing a
  parameter.
- Log lines describe the request only — never log tokens, payloads, or response
  bodies.

## Response validation

Every response shape gets a zod schema, an inferred type, and a deserializer
that accepts `unknown`. Use `z.strictObject` — `z.object` silently drops keys the
schema doesn't declare, so a field appearing in the response goes unnoticed:

```ts
export const postSchema = z.strictObject({
    id: z.number(),
    userId: z.number(),
    title: z.string(),
    body: z.string(),
})

export type PostResponse = z.infer<typeof postSchema>

export function deserializePostResponse(value: unknown) {
    return postSchema.parse(value)
}
```

Specs pass raw JSON straight in — never hand-cast a response:

```ts
const post = deserializePostResponse(await resp.json()) // yes
const post = (await resp.json()) as PostResponse // no
```

## Fixtures

Two files, each extending `base` with a local type alias and re-exporting
`expect`. One-line fixtures, no teardown unless something needs cleanup.

```ts
type ApiClients = {
    postsEndpoint: PostsEndpoint
}

export const test = base.extend<ApiClients>({
    postsEndpoint: async ({ request }, use) => await use(new PostsEndpoint(request)),
})

export { expect }
```

**Specs import `test` and `expect` from the fixture file, never from
`@playwright/test`.** UI specs use `../../fixtures/page-fixtures`; API specs use
`../../fixtures/endpoints-fixtures`. Adding a page object or endpoint means
adding it to the fixture type and the `extend` block in the same commit.

## Specs

```ts
import { test, expect } from '../../fixtures/endpoints-fixtures'

test.describe('Posts API tests', { tag: '@api' }, () => {
    test('should create a post', async ({ postsEndpoint }) => {
        const payload: PostPayload = {
            userId: randomUserId(),
            title: randomTitle(),
            body: randomBody(),
        }
        const response = await postsEndpoint.createPost(payload)

        expect(response.status()).toBe(201)

        const post = deserializePostResponse(await response.json())
        expect(post.title).toBe(payload.title)
    })
})
```

- Wrap every spec in `test.describe`.
- Tags go in the **options object** — `{ tag: '@api' }` — not in the title
  string, and hoist to the `describe` when the whole file shares one. In use:
  `@smoke`, `@ui`, `@api`.
- Naming inside a test: `response` for the response, the entity name for the
  parsed body (`post`, `postsList`).
- **Assert the status before deserializing**, so a non-2xx reports the status
  rather than an opaque zod parse error. Blank line between the arrange/act
  block and the assertions.
- Test data comes from `test-data/` helpers. Don't call `faker` inline in a spec.
- `fullyParallel` is **false** globally. A spec safe to parallelise opts in
  itself with `test.describe.configure({ mode: 'parallel' })`, as
  `tests/ui/home-page.test.ts` does.
- No `test.skip` left behind — `playwright/no-skipped-test` is an error in CI.
- No `page.pause()`, no `waitForTimeout`. Web-first assertions only; the 15s
  `expect` timeout is the wait.

## Environment and config

All environment values come from `profiles/.env.${TEST_ENV}` (default `dev`),
loaded once in `playwright.config.ts` with `quiet: true`. Required:
`UI_URL`, `API_URL`, `USER_NAME`, `PASSWORD`, `SECRET_KEY`.

Never give an env var a placeholder default in a spec. A fallback like
`process.env.SECRET_KEY ?? 'test-token'` turns a missing secret into a confusing
401 instead of a clear startup failure. Guard it at config load, declare it
non-optional in `types/env.d.ts`, and read it directly.

A new required variable must get a fail-fast guard in `playwright.config.ts`
matching the existing shape:

```ts
if (!process.env.API_URL) {
    throw new Error(`Environment variable 'API_URL' is not set in profiles/.env.${ENV}`)
}
```

Never hardcode a URL in a spec or page object — `baseURL` is set per project
(`UI_URL` for `ui`, `API_URL` for `api`). Never commit real credentials;
`profiles/.env.dev` holds public demo values only.

Projects: `setup` (single worker, writes `playwright/.auth/user.json`) → `ui`
(depends on `setup`, consumes that storage state) → `api` (independent).
Timeouts are 15s test and 15s expect; retries are CI-only. Raising retries or
timeouts to make something pass is not a fix.

## Logging

`utils/log-utils.ts` exports a winston singleton as default. Import it as
`logger` and use `logger.info` for request tracing in the API layer.
`console.log` doesn't appear anywhere in this repo — keep it that way.

## Known drift

Real inconsistencies in the tree. Don't copy them; fix opportunistically when
you're already editing the file, and don't reformat whole files as a drive-by.

1. **`format:check` fails on every file** because `core.autocrlf=true` yields
   CRLF while `.prettierrc` demands `lf`, and there's no `.gitattributes`.
   Content-wise, `pages/`, `utils/` and `playwright.config.ts` are clean.
   Fix is a `.gitattributes` with `* text=auto eol=lf`.
2. **Genuinely unformatted:** all of `api/`, both specs, `test-data/`,
   `fixtures/endpoints-fixtures.ts` — mostly lines over 80 chars, plus 2-space
   indent in `post-payloads.ts` and stray indentation in `post-response.ts`.
3. **Redundant constructors.** `constructor(page: Page) { super(page) }` in
   `HomePage`, `LoginPage`, `Navigation` adds nothing over the inherited one. It
   is the established pattern, so keep it for consistency unless you're removing
   all of them at once.
4. **`README.md` is stale**: it puts test data at `tests/test-data/api/` (actually
   `test-data/`) and states Node `>=20` (`package.json` now requires
   `^20.19.0 || ^22.13.0 || >=24`).
5. **`tsconfig.json` `include`** still lists `config/**/*.ts`, `helpers/**/*.ts`
   and `enums/**/*.ts` — none of those directories exist.
