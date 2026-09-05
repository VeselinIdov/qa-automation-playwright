---
name: add-ui-test
description: Add UI test coverage in this Playwright repo — new page object, navigation entry, fixture wiring, and spec under tests/ui. Use when asked to cover a screen or user flow in the browser, e.g. "add tests for the cart page", "cover checkout", "test the product filter".
---

# Add a UI test

The app under test is saucedemo.com (`UI_URL` in `profiles/.env.dev`). UI specs
run in the `ui` project, which depends on `setup` — so tests start
**already logged in** via `playwright/.auth/user.json`. Never log in inside a
spec; that's `tests/auth.setup.ts`'s job.

Read `.claude/skills/project-code-style/SKILL.md` first if you haven't this
session.

## Checklist

1. `pages/<screen>-page.ts` — page object, if the screen has none
2. `pages/navigation.ts` — URL + `navigateTo<Screen>()`, if it's a new screen
3. `fixtures/page-fixtures.ts` — add to the type **and** the `extend` block
4. `tests/ui/<screen>-page.test.ts` — the spec

Then verify — **without executing the suite**:

```bash
npm run typecheck
npm run lint
npx playwright test tests/ui --list    # enumerates, does not run
```

You may run the spec you just wrote — scope it to that file, not the suite. It
drives a real browser against `UI_URL` and mutates the shared login state, so
`--repeat-each` loops and full-suite runs are the user's call, not a default.

## Before writing locators

Do not invent selectors. Saucedemo uses `data-test` attributes throughout, and
guessing produces tests that fail for the wrong reason.

**Read the real markup.** In order of preference:

- **`npx playwright cli`** — drive a headless browser from the terminal and read
  the selector it echoes back. See "Reading a page before writing locators" in
  `CLAUDE.md` for the command sequence. Log in through it first (saucedemo
  prints its own credentials on the login page); targets are refs from `find`,
  not visible text; `close` the session when done.
- an existing page object, for the convention already in use
- markup or a `data-test` name the user provides

If none of those are available, write the page object from the most plausible
`data-test` naming and report the locators as **unverified**. An unverified
locator the user then confirms is a fine outcome; a locator you claim works
without having looked is not.

Reading the page over the CLI needs a logged-in session for anything behind the
login screen — drive the login form through it the same way `auth.setup.ts`
does, rather than assuming the storage state applies.

## 1. Page object

Extend `BasePage`. Locators are `private readonly`, initialised inline off
`this.page`. Getters return `Locator`; actions return `Promise<void>`.

```ts
import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

export class CartPage extends BasePage {
    private readonly pageTitle: Locator = this.page.getByText('Your Cart')
    private readonly checkoutButton: Locator = this.page.locator('[data-test="checkout"]')

    constructor(page: Page) {
        super(page)
    }

    getPageTitle(): Locator {
        return this.pageTitle
    }

    getItemByName(itemName: string): Locator {
        return this.page.locator('[data-test="inventory-item"]').filter({ hasText: itemName })
    }

    async checkout(): Promise<void> {
        await this.checkoutButton.click()
    }
}
```

Rules that matter here:

- **No `expect` in a page object.** Return the `Locator`; the spec asserts.
- **No `page.goto`.** URLs belong in `Navigation`.
- **Dynamic locators are methods** taking a parameter and narrowing with
  `.filter({ hasText })` — never build a selector by string concatenation.
- **Locator preference:** `getByRole` → `getByPlaceholder` / `getByText` →
  `[data-test="..."]`. Never XPath, never structural CSS like
  `div > div:nth-child(3)`, never a CSS class chain — classes are styling and
  change without notice.
- One class per screen. A shared header or menu is its own class, like
  `Navigation`.

## 2. Navigation

New screens get a URL constant and a method:

```ts
export class Navigation extends BasePage {
    private readonly homePageURL = '/inventory.html'
    private readonly cartPageURL = '/cart.html'

    async navigateToCart() {
        await this.open(this.cartPageURL)
    }
}
```

Prefer navigating through the UI when the flow is what's under test (clicking
the cart icon exercises real behaviour); use a direct URL when you just need to
arrive at a screen to assert on it.

## 3. Fixture wiring — don't skip

Two edits in `fixtures/page-fixtures.ts`:

```ts
import { CartPage } from '../pages/cart-page'

type Fixtures = {
    loginPage: LoginPage
    homePage: HomePage
    navigation: Navigation
    cartPage: CartPage // 1. type
}

export const test = base.extend<Fixtures>({
    cartPage: async ({ page }, use) => await use(new CartPage(page)), // 2.
})
```

## 4. Spec

```ts
import { expect, test } from '../../fixtures/page-fixtures'

test.describe.configure({ mode: 'parallel' })

test.describe('Cart page Tests', () => {
    test('title visible', { tag: '@smoke' }, async ({ cartPage, navigation }) => {
        await navigation.navigateToCart()
        await expect(cartPage.getPageTitle()).toBeVisible()
    })
})
```

- Import `test`/`expect` from `../../fixtures/page-fixtures`, never
  `@playwright/test`.
- `fullyParallel` is `false` globally. Add
  `test.describe.configure({ mode: 'parallel' })` **only** if the tests in the
  file share no state — anything touching the cart mutates state carried in the
  shared storage state, so leave those serial.
- Tags in the options object: `@smoke` for the load-bearing check on a screen,
  `@ui` for the rest.
- Navigate first, then assert. Request only the fixtures the test uses.
- UI test titles are terse noun phrases (`'title visible'`), unlike the
  `'should ...'` style in API specs.

## Waiting

Never `waitForTimeout`, never `waitForSelector`, never `page.pause()` in
committed code (`playwright/no-page-pause` warns). Web-first assertions retry on
their own and the 15s `expect` timeout is the wait:

```ts
await expect(cartPage.getPageTitle()).toBeVisible() // yes
await cartPage.getPageTitle().waitFor() // no
expect(await cartPage.getPageTitle().isVisible()).toBe(true) // no — no retry
```

That last form is the common trap: it snapshots visibility once, so it's flaky
by construction.

## State isolation

Every UI test starts from the same saved login, and saucedemo's cart persists in
`localStorage` for that session. A test that adds to the cart must either undo
it or stay serial with the tests around it. If you find yourself needing
ordering between tests, that's a signal to reset state in the test itself — not
to reach for `test.describe.serial`.

## Report back

List files created and confirm typecheck and lint pass. Then state plainly that
the spec has **not been run** and which locators are unverified. Leave the run
to the user:

```bash
npx playwright test tests/ui        # needs npx playwright install first
```
