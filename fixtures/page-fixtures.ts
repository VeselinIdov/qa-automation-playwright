import { test as base, expect } from '@playwright/test'
import { LoginPage } from '../pages/login-page'
import { HomePage } from '../pages/home-page'
import { CartPage } from '../pages/cart-page'
import { Navigation } from '../pages/navigation'

type Fixtures = {
    loginPage: LoginPage
    homePage: HomePage
    cartPage: CartPage
    navigation: Navigation
}

export const test = base.extend<Fixtures>({
    loginPage: async ({ page }, use) => await use(new LoginPage(page)),
    homePage: async ({ page }, use) => await use(new HomePage(page)),
    cartPage: async ({ page }, use) => await use(new CartPage(page)),
    navigation: async ({ page }, use) => await use(new Navigation(page)),
})

export { expect }
