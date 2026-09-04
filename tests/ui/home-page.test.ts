import { expect, test } from '../../fixtures/page-fixtures'

test.describe.configure({ mode: 'parallel' })

test.describe('Home page Tests', { tag: '@ui' }, () => {
    test('header visible', async ({ homePage, navigation }) => {
        await navigation.navigateToHome()
        await expect(homePage.getPageHeader()).toBeVisible()
    })

    test('sections are visible', async ({ homePage, navigation }) => {
        await navigation.navigateToHome()
        await expect(homePage.getSectionByName('Sauce Labs Backpack')).toBeVisible()
    })
})
