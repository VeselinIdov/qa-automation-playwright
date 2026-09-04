import { expect, test } from '../../fixtures/page-fixtures'

// Left serial: the cart lives in localStorage carried by the shared storage
// state, so these tests mutate state the rest of the file can see.
test.describe('Cart page Tests', () => {
    const product = 'Sauce Labs Backpack'

    test(
        'adding a product puts it in the cart',
        { tag: '@smoke' },
        async ({ homePage, cartPage, navigation }) => {
            await navigation.navigateToHome()
            await homePage.addToCart(product)

            await expect(navigation.getCartBadge()).toHaveText('1')

            await navigation.openCart()

            await expect(cartPage.getPageTitle()).toBeVisible()
            await expect(cartPage.getItemByName(product)).toBeVisible()
        }
    )
})
