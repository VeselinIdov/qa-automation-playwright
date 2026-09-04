import { test as base, expect, APIRequestContext } from '@playwright/test'
import { PostsEndpoint } from '../api/endpoints/posts-endpoint'

type ApiClients = {
    authedRequest: APIRequestContext
    postsEndpoint: PostsEndpoint
}

type ApiWorkerFixtures = {
    apiToken: string
}

export const test = base.extend<ApiClients, ApiWorkerFixtures>({
    // Worker-scoped so a real login runs once per worker, not once per test.
    // This API uses a static token; to switch to a login endpoint, replace the
    // body — nothing downstream changes:
    //
    //   const anon = await playwright.request.newContext({ baseURL: process.env.API_URL })
    //   const response = await new AuthEndpoint(anon).login({
    //       username: process.env.USER_NAME,
    //       password: process.env.PASSWORD,
    //   })
    //   expect(response.status()).toBe(200)
    //   const { accessToken } = deserializeLoginResponse(await response.json())
    //   await use(accessToken)
    //   await anon.dispose()
    apiToken: [async ({}, use) => await use(process.env.SECRET_KEY), { scope: 'worker' }],

    // Every endpoint hangs off this context, so auth is never a method parameter.
    authedRequest: async ({ playwright, baseURL, apiToken }, use) => {
        const context = await playwright.request.newContext({
            baseURL,
            extraHTTPHeaders: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiToken}`,
            },
        })
        await use(context)
        await context.dispose()
    },

    postsEndpoint: async ({ authedRequest }, use) => await use(new PostsEndpoint(authedRequest)),
})

export { expect }
