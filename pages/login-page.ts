import { BasePage } from './base-page'
import { Page } from '@playwright/test'

export class LoginPage extends BasePage {
    private readonly usernameField = this.page.getByPlaceholder('Username')
    private readonly passwordField = this.page.getByPlaceholder('Password')
    private readonly loginButton = this.page.getByText('Login')

    constructor(page: Page) {
        super(page)
    }

    async open(): Promise<void> {
        await this.page.goto('/')
    }

    async login(username: string, password: string): Promise<void> {
        await this.usernameField.fill(username)
        await this.passwordField.fill(password)
        await this.loginButton.click()
    }
}
