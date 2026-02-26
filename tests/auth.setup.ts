import { test } from '../fixtures/page-fixtures'

test('create storageState', async ({ page, loginPage }) => {
    await loginPage.open()
    await loginPage.login(process.env.USER_NAME!, process.env.PASSWORD!)

    await page.context().storageState({ path: 'playwright/.auth/user.json' })
})
