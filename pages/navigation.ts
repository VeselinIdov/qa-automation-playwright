import { BasePage } from './base-page'
import { Page, Locator } from '@playwright/test'

// Owns URLs and the header that persists across every logged-in screen.
export class Navigation extends BasePage {
    private readonly loginPageURL = '/'
    private readonly homePageURL = '/inventory.html'
    private readonly cartPageURL = '/cart.html'
    private readonly cartLink: Locator = this.page.locator('[data-test="shopping-cart-link"]')
    private readonly cartBadge: Locator = this.page.locator('[data-test="shopping-cart-badge"]')

    constructor(page: Page) {
        super(page)
    }

    async navigateToLogin() {
        await this.open(this.loginPageURL)
    }

    async navigateToHome() {
        await this.open(this.homePageURL)
    }

    async navigateToCart() {
        await this.open(this.cartPageURL)
    }

    async openCart(): Promise<void> {
        await this.cartLink.click()
    }

    getCartBadge(): Locator {
        return this.cartBadge
    }
}
