import { BasePage } from './base-page'
import { Page } from '@playwright/test'

export class Navigation extends BasePage {
    private readonly homePageURL = '/inventory.html'

    constructor(page: Page) {
        super(page)
    }

    async navigateToHome() {
        await this.open(this.homePageURL)
    }
}
