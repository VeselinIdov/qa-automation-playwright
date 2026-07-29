// Ambient declarations for the variables loaded from profiles/.env.<TEST_ENV>.
// playwright.config.ts throws at load time if UI_URL or API_URL is missing, so
// those two are declared non-optional; the rest are only read inside the
// projects that need them.
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            /** Base URL for the setup and ui projects */
            UI_URL: string
            /** Base URL for the api project */
            API_URL: string
            /** Selects profiles/.env.<TEST_ENV>, defaults to dev */
            TEST_ENV?: string
            /** saucedemo login, consumed by tests/auth.setup.ts */
            USER_NAME?: string
            PASSWORD?: string
            /** Bearer token for the posts API */
            SECRET_KEY?: string
        }
    }
}

export {}
