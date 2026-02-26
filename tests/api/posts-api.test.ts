import { test, expect } from '../../fixtures/endpoints-fixtures'
import { deserializePostResponse, deserializePostsResponse } from '../../api/payloads/response/post-response'
import { PostPayload } from '../../api/payloads/requests/post-payloads'
import { randomBody, randomTitle, randomUserId } from '../../test-data/posts-test-data'

test.describe('Posts API tests', () => {
    const token = process.env.SECRET_KEY ?? 'test-token'

    test('should retrieve a post by id', { tag: '@api' }, async ({ postsEndpoint }) => {
        const resp = await postsEndpoint.getPost(1, token)
        const post = deserializePostResponse(await resp.json())

        expect(resp.status()).toBe(200)
        expect(post.id).toEqual(1)
        expect(post.title).not.toEqual('')
    })

    test('should retrieve all posts', { tag: '@api' }, async ({ postsEndpoint }) => {
        const resp = await postsEndpoint.getPosts(token)
        const postsList = deserializePostsResponse(await resp.json())

        expect(resp.status()).toBe(200)
        expect(postsList.length).toBeGreaterThan(0)
    })

    test('should create a post', { tag: '@api' }, async ({ postsEndpoint }) => {
        const payload: PostPayload = {
            userId: randomUserId(),
            title: randomTitle(),
            body: randomBody(),
        }
        const resp = await postsEndpoint.createPost(payload, token)
        const post = deserializePostResponse(await resp.json())

        expect(resp.status()).toBe(201)
        expect(post.title).toBe(payload.title)
        expect(post.body).toBe(payload.body)
    })

    test('should update a post', { tag: '@api' }, async ({ postsEndpoint }) => {
        const payload: PostPayload = {
            userId: randomUserId(),
            title: randomTitle(),
            body: randomBody(),
        }
        const resp = await postsEndpoint.updatePost(1, payload, token)
        const post = deserializePostResponse(await resp.json())

        expect(resp.status()).toBe(200)
        expect(post.id).toEqual(1)
        expect(post.title).toEqual(payload.title)
    })

    test('should partially update a post', { tag: '@api' }, async ({ postsEndpoint }) => {
        const payload: Partial<PostPayload> = {
            title: randomTitle(),
        }
        const resp = await postsEndpoint.patchPost(1, payload, token)
        const post = deserializePostResponse(await resp.json())

        expect(resp.status()).toBe(200)
        expect(post.title).toEqual(payload.title)
    })

    test('should delete a post', { tag: '@api' }, async ({ postsEndpoint }) => {
        const resp = await postsEndpoint.deletePost(1, token)

        expect(resp.status()).toBeGreaterThanOrEqual(200)
        expect(resp.status()).toBeLessThan(300)
    })
})

