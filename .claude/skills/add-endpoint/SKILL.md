---
name: add-endpoint
description: Scaffold a new API resource (endpoint class, request interface, zod response schema, fixture wiring) and its spec in this Playwright repo. Use when adding API coverage for a resource that has no endpoint class yet — e.g. "add tests for /comments", "cover the users API", "we need a new endpoint".
---

# Add an API resource

Adding a resource touches **five** places. Skipping the fixture registration is
the usual mistake — the endpoint compiles fine and the spec fails at runtime
with an undefined fixture.

Read `.claude/skills/project-code-style/SKILL.md` first if you haven't this
session — formatting and naming rules come from there and are not repeated here.

## Checklist

1. `api/payloads/requests/<resource>-payloads.ts` — request body interface
2. `api/payloads/response/<resource>-response.ts` — zod schema + deserializers
3. `api/endpoints/<resource>-endpoint.ts` — endpoint class
4. `fixtures/endpoints-fixtures.ts` — add to the type **and** the `extend` block
5. `tests/api/<resource>-api.test.ts` — the spec
6. `test-data/<resource>-test-data.ts` — only if the resource takes a body

Then verify — **without executing the suite**:

```bash
npm run typecheck
npm run lint
npx playwright test tests/api --list    # enumerates, does not run
```

You may run the spec you just wrote — scope it to that file. The `api` project
hits a live `API_URL` with real POST/PUT/PATCH/DELETE calls, so re-running to
see whether a failure settles is not a debugging strategy; read the error.

## Before writing anything

The zod schema must match the real response. A wrong one fails at `.parse()`
with an error that reads like a product bug.

Get the shape from the API documentation, an existing schema for a sibling
resource, or a sample response the user provides. **Do not send requests to the
API to discover it** — ask the user for a sample instead. If you have to write
the schema from documentation alone, say so and mark it unverified. Never invent
fields to fill gaps.

## 1. Request interface

Plain interface, no zod. Only fields the client sends.

```ts
export interface CommentPayload {
    postId: number
    name: string
    email: string
    body: string
}
```

## 2. Response schema

```ts
import { z } from 'zod'

export const commentSchema = z.object({
    id: z.number(),
    postId: z.number(),
    name: z.string(),
    email: z.string(),
    body: z.string(),
})

export type CommentResponse = z.infer<typeof commentSchema>

export function deserializeCommentResponse(value: unknown) {
    return commentSchema.parse(value)
}

export function deserializeCommentsResponse(value: unknown) {
    return z.array(commentSchema).parse(value)
}
```

Add the list deserializer only if a list endpoint exists. Model genuinely
optional fields with `.optional()` — never widen a field to `z.any()` to make a
parse pass; that defeats the point of validating.

## 3. Endpoint class

Extend `BaseRequest` to inherit the logged verb helpers. Path as a
`private readonly` field. No `token` parameter — the `api` project sets the
`Authorization` header for every request off the `authedRequest` fixture.
Include only the verbs the resource actually supports.

```ts
import { BaseRequest } from '../base-request'
import { CommentPayload } from '../payloads/requests/comment-payloads'

export class CommentsEndpoint extends BaseRequest {
    private readonly commentsPath = 'comments'

    async getComment(commentId: number) {
        return await this.getRequest(`${this.commentsPath}/${commentId}`)
    }

    async getComments() {
        return await this.getRequest(this.commentsPath)
    }

    async createComment(payload: CommentPayload) {
        return await this.postRequest(this.commentsPath, payload)
    }

    async patchComment(commentId: number, payload: Partial<CommentPayload>) {
        return await this.patchRequest(`${this.commentsPath}/${commentId}`, payload)
    }
}
```

Don't add HTTP plumbing here. If a resource needs a verb or header shape
`BaseRequest` lacks, extend `BaseRequest` so every endpoint benefits — and keep
the `logger.info` line consistent with its siblings.

Nested resources belong on the owning resource's class:
`getPostComments(postId)` → `posts/${postId}/comments` lives on
`PostsEndpoint`, not a new class.

## 4. Fixture wiring — don't skip

Two edits in `fixtures/endpoints-fixtures.ts`:

```ts
import { CommentsEndpoint } from '../api/endpoints/comments-endpoint'

type ApiClients = {
    postsEndpoint: PostsEndpoint
    commentsEndpoint: CommentsEndpoint // 1. type
}

export const test = base.extend<ApiClients, ApiWorkerFixtures>({
    postsEndpoint: async ({ authedRequest }, use) => await use(new PostsEndpoint(authedRequest)),
    commentsEndpoint: async ({ authedRequest }, use) => await use(new CommentsEndpoint(authedRequest)), // 2.
})
```

Take `authedRequest`, never the built-in `request` — that's what carries the
`Authorization` and `Content-Type` headers. Leave `apiToken` and `authedRequest`
alone; a new endpoint never touches them.

Fixture name is the class name in camelCase. It's lazy — declaring it costs
nothing for specs that don't request it.

## 5. Test data

Only for resources with a request body. Named generators, one per field, so
specs never call `faker` directly.

```ts
import { faker } from '@faker-js/faker'

export function randomEmail() {
    return faker.internet.email()
}

export function randomName() {
    return faker.person.fullName()
}
```

Reuse existing helpers where the field matches (`randomBody` from
`test-data/posts-test-data.ts`) rather than duplicating them.

## 6. Spec

```ts
import { test, expect } from '../../fixtures/endpoints-fixtures'
import {
    deserializeCommentResponse,
    deserializeCommentsResponse,
} from '../../api/payloads/response/comment-response'
import { CommentPayload } from '../../api/payloads/requests/comment-payloads'

test.describe('Comments API tests', { tag: '@api' }, () => {
    test('should retrieve a comment by id', async ({ commentsEndpoint }) => {
        const response = await commentsEndpoint.getComment(1)

        expect(response.status()).toBe(200)

        const comment = deserializeCommentResponse(await response.json())
        expect(comment.id).toEqual(1)
    })
})
```

Cover per verb: happy path with a status assertion plus at least one payload
assertion; for writes, assert the response echoes what you sent. `POST` expects
`201`, the rest `200` — including `DELETE`. **Pin the exact status.** A range
like `toBeGreaterThanOrEqual(200)` / `toBeLessThan(300)` passes on any 2xx and
hides a contract change from 200 to 204.

Tag everything `@api`. Don't add negative-path tests against a mock API like
jsonplaceholder unless asked — it doesn't validate input, so a 4xx assertion
will fail for the wrong reason. Say that rather than writing a test you expect
to fail.

## Report back

State which files were created and that typecheck and lint pass. Then list what
is **unverified**: the spec has not been executed, and the schema may be
documentation-derived rather than confirmed against a real response. End with
the command the user can run when they want to:

```bash
npx playwright test tests/api
```
