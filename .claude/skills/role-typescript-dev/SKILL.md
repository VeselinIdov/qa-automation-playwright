---
name: role-typescript-dev
description: The senior TypeScript lens — type design, API boundaries, error handling, and code-quality judgment for this repo's non-test code (api/, pages/, fixtures/, utils/, config). Use when designing or reviewing types, deciding an abstraction, handling errors, or judging whether code is over- or under-engineered. For formatting and naming rules use project-code-style instead.
---

# Senior TypeScript lens

`tsconfig.json` is `strict: true` with `noImplicitAny`. Treat the compiler as the
cheapest test in the suite — every escape hatch moves a failure from build time
to run time.

## Make illegal states unrepresentable

The type should permit only what is real.

```ts
// weak — nothing stops an empty token, and every caller must remember to pass it
function authHeaders(token: string) {}

// weak — optional everything, so every use site needs a guard
interface Post {
    id?: number
    title?: string
}
```

Prefer narrowing at construction over checking at use. When a value has a
finite set of shapes, model it as a union and let the compiler force the cases:

```ts
type Result = { ok: true; post: PostResponse } | { ok: false; status: number; body: string }
```

A discriminated union beats a bag of optional fields — exhaustive `switch` gets
checked, and adding a case surfaces every place that must handle it.

## Never widen to silence the compiler

Banned, in order of how much damage they do:

- `any` — disables checking silently and spreads through every value it touches
- `as` on a value whose shape you haven't verified — a lie the compiler believes
- `@ts-ignore` / `@ts-expect-error` without a comment explaining the reason
- `!` non-null assertion, except on env vars already validated in
  `playwright.config.ts` (as `tests/auth.setup.ts` does)
- `object` or `{}` as a parameter type when the real shape is known —
  `BaseRequest.postRequest(payload: object)` is the existing example; a generic
  parameter would carry the real type through

When a type fights you, the type is usually telling you the design is wrong.
Fix the design before reaching for a cast.

## Validate at the boundary, trust inside

Anything crossing a process boundary — HTTP responses, env vars, JSON files — is
`unknown` until proven. This repo does that correctly with zod:

```ts
export function deserializePostResponse(value: unknown) {
    return postSchema.parse(value)
}
```

That is the pattern: parse **once** at the edge, derive the type with
`z.infer`, and let everything downstream work with a real type. Never
`as PostResponse` on a `.json()` result — it asserts a shape nobody checked, and
the failure surfaces later as an `undefined` in an unrelated place.

Corollary: don't validate twice. Once parsed, pass the typed value; re-checking
fields downstream is noise that implies the parse didn't happen.

## Fail fast and loudly

`playwright.config.ts` throws at load if any of `REQUIRED_ENV_VARS` is missing,
naming both the variable and the profile file. That is the right shape: a missing
prerequisite should stop everything with a message naming the fix, not surface as
a confusing failure three layers away. It is also why auth needs no runtime
guard — `SECRET_KEY` is validated before a single request is built.

- Error messages state **what is wrong and where to fix it** —
  `` `Environment variable 'UI_URL' is not set in profiles/.env.${ENV}` `` is the
  standard to match.
- Never swallow an error to keep going. No empty `catch`. If a failure is truly
  tolerable, say why in a comment.
- Don't catch what you can't handle. Letting it propagate to the test runner
  produces a better report than a caught-and-logged error that yields a
  misleading pass.
- Never leak secrets into a message or log line — no tokens, no passwords.

## Async

- Every promise is awaited or explicitly returned.
  `@typescript-eslint/no-floating-promises` is an error here, and in a test suite
  a floating promise means an assertion that never ran — a **silent false pass**,
  the worst failure mode available.
- Return types on async functions are `Promise<T>`, and `Promise<void>` when
  there's nothing to return — `LoginPage.login` is the pattern.
- `BaseRequest` returns the un-awaited promise and the endpoint class awaits it.
  That's deliberate; keep the split rather than awaiting twice.
- Don't serialise independent awaits in a loop when `Promise.all` fits — but
  never parallelise Playwright actions on one page, which must be sequential.

## Design and abstraction

- **Name for intent, not mechanism.** `navigateToHome()` not `gotoUrl2()`;
  `deserializePostResponse` not `parse`.
- **One reason to change per class.** `BaseRequest` owns HTTP plumbing;
  `PostsEndpoint` owns post semantics. A new verb goes in the base so every
  endpoint benefits; a post-specific path goes in the endpoint.
- **Encapsulate.** Fields are `private readonly` unless a subclass genuinely
  needs them (`BasePage.page` is `protected` for exactly that reason).
- **Composition over inheritance beyond one level.** `BasePage` and
  `BaseRequest` earn their layer. A third level rarely does.
- **Don't abstract on the first repeat.** Two similar lines are cheaper than a
  wrong abstraction. Wait for the third, when the shape is actually known.
- **Delete dead code.** `utils/helpers.ts` was removed for exactly this reason —
  four exports, no callers, one of them re-implementing faker. Unused code reads
  as load-bearing and gets maintained for nothing.
- **Prefer a plain function** to a class with no state. `test-data/` is right to
  be functions; `LogUtils` is a class because it holds a configured logger.

## Review checklist

1. `any`, unchecked `as`, `@ts-ignore`, or `!` outside a validated env var
2. Unvalidated external data flowing inward as a typed value
3. Floating promise or missing `await`
4. Swallowed error, or a message that doesn't say how to fix it
5. Optional fields modelling what should be a union
6. A secret in a log line or error message
7. Abstraction with one caller, or a duplicate with three
8. Public mutable state where `private readonly` would do
9. Dead code and unused exports

Report by severity with `file:line`. A rule broken deliberately for a stated
reason is fine — an undocumented one is not.
