import { Page } from '@playwright/test'

export class BasePage {
    protected page: Page

    constructor(page: Page) {
        this.page = page
    }

    async open(url: string) {
        await this.page.goto(url)
    }
}
