import { BaseRequest } from '../base-request'
import { PostPayload } from '../payloads/requests/post-payloads'

export class PostsEndpoint extends BaseRequest {
    private readonly postsPath = 'posts'

    async getPost(postId: number, token: string) {
        return await this.getRequest(`${this.postsPath}/${postId}`, token)
    }

    async getPosts(token: string) {
        return await this.getRequest(this.postsPath, token)
    }

    async createPost(payload: PostPayload, token: string) {
        return await this.postRequest(this.postsPath, payload, token)
    }

    async updatePost(postId: number, payload: PostPayload, token: string) {
        return await this.putRequest(`${this.postsPath}/${postId}`, payload, token)
    }

    async patchPost(postId: number, payload: Partial<PostPayload>, token: string) {
        return await this.patchRequest(`${this.postsPath}/${postId}`, payload, token)
    }

    async deletePost(postId: number, token: string) {
        return await this.deleteRequest(`${this.postsPath}/${postId}`, token)
    }
}
