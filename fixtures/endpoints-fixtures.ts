import { test as base, expect } from '@playwright/test'
import { PostsEndpoint } from '../api/endpoints/posts-endpoint'

type ApiClients = {
    postsEndpoint: PostsEndpoint
}

export const test = base.extend<ApiClients>({
    postsEndpoint: async ({ request }, use) => await use(new PostsEndpoint(request)),
})

export { expect }