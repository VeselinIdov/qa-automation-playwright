import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

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

    getItemByName(itemName: string): Locator {
        return this.page.locator('[data-test="inventory-item"]').filter({ hasText: itemName })
    }

    // The button's own data-test embeds a slugified product name
    // (add-to-cart-sauce-labs-backpack), so scope to the card and match the
    // label instead of building that selector by hand.
    async addToCart(itemName: string): Promise<void> {
        await this.getItemByName(itemName).getByRole('button', { name: 'Add to cart' }).click()
    }
}
