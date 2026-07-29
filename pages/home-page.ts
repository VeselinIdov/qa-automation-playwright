import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

export class HomePage extends BasePage {
    private readonly pageHeader: Locator = this.page.getByText('Products')

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
