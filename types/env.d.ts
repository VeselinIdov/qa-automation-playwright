// Ambient declarations for the variables loaded from profiles/.env.<TEST_ENV>.
// playwright.config.ts throws at load time for every name in REQUIRED_ENV_VARS,
// so those are declared non-optional; TEST_ENV itself has a default.
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
            USER_NAME: string
            PASSWORD: string
            /** Bearer token for the posts API */
            SECRET_KEY: string
        }
    }
}

export {}
