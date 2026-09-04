import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

export class CartPage extends BasePage {
    // data-test="title" is reused across screens — 'Products' on inventory,
    // 'Your Cart' here — so the text filter is what identifies the page.
    private readonly pageTitle: Locator = this.page
        .locator('[data-test="title"]')
        .filter({ hasText: 'Your Cart' })

    constructor(page: Page) {
        super(page)
    }

    getPageTitle(): Locator {
        return this.pageTitle
    }

    getItemByName(itemName: string): Locator {
        return this.page.locator('[data-test="inventory-item"]').filter({ hasText: itemName })
    }
}
