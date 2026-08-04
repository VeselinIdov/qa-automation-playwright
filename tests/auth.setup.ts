import { expect, test } from '../fixtures/page-fixtures'

test('create storageState', async ({ page, loginPage, homePage }) => {
    await loginPage.open()
    await loginPage.login(process.env.USER_NAME, process.env.PASSWORD)

    await expect(homePage.getPageHeader()).toBeVisible()

    await page.context().storageState({ path: 'playwright/.auth/user.json' })
})
