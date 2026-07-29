import { z } from 'zod'

export const postSchema = z.object({
    id: z.number(),
    userId: z.number(),
    title: z.string(),
    body: z.string(),
})

export type PostResponse = z.infer<typeof postSchema>

export function deserializePostResponse(value: unknown) {
    return postSchema.parse(value)
}

export function deserializePostsResponse(value: unknown) {
    return z.array(postSchema).parse(value)
}
