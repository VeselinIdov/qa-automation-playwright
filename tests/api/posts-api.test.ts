import { test, expect } from '../../fixtures/endpoints-fixtures'
import { deserializePostResponse, deserializePostsResponse } from '../../api/payloads/response/post-response'
import { PostPayload } from '../../api/payloads/requests/post-payloads'
import { randomBody, randomTitle, randomUserId } from '../../test-data/posts-test-data'

test.describe('Posts API tests', { tag: '@api' }, () => {
    test('should retrieve a post by id', async ({ postsEndpoint }) => {
        const response = await postsEndpoint.getPost(1)

        expect(response.status()).toBe(200)

        const post = deserializePostResponse(await response.json())
        expect(post.id).toEqual(1)
        expect(post.title).not.toEqual('')
    })

    test('should retrieve all posts', async ({ postsEndpoint }) => {
        const response = await postsEndpoint.getPosts()

        expect(response.status()).toBe(200)

        const postsList = deserializePostsResponse(await response.json())
        expect(postsList.length).toBeGreaterThan(0)
    })

    test('should create a post', async ({ postsEndpoint }) => {
        const payload: PostPayload = {
            userId: randomUserId(),
            title: randomTitle(),
            body: randomBody(),
        }
        const response = await postsEndpoint.createPost(payload)

        expect(response.status()).toBe(201)

        const post = deserializePostResponse(await response.json())
        expect(post.title).toBe(payload.title)
        expect(post.body).toBe(payload.body)
    })

    test('should update a post', async ({ postsEndpoint }) => {
        const payload: PostPayload = {
            userId: randomUserId(),
            title: randomTitle(),
            body: randomBody(),
        }
        const response = await postsEndpoint.updatePost(1, payload)

        expect(response.status()).toBe(200)

        const post = deserializePostResponse(await response.json())
        expect(post.id).toEqual(1)
        expect(post.title).toEqual(payload.title)
    })

    test('should partially update a post', async ({ postsEndpoint }) => {
        const payload: Partial<PostPayload> = {
            title: randomTitle(),
        }
        const response = await postsEndpoint.patchPost(1, payload)

        expect(response.status()).toBe(200)

        const post = deserializePostResponse(await response.json())
        expect(post.title).toEqual(payload.title)
    })

    test('should delete a post', async ({ postsEndpoint }) => {
        const response = await postsEndpoint.deletePost(1)

        expect(response.status()).toBe(200)
    })
})
