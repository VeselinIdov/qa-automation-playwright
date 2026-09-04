import { BaseRequest } from '../base-request'
import { PostPayload } from '../payloads/requests/post-payloads'

export class PostsEndpoint extends BaseRequest {
    private readonly postsPath = 'posts'

    async getPost(postId: number) {
        return await this.getRequest(`${this.postsPath}/${postId}`)
    }

    async getPosts() {
        return await this.getRequest(this.postsPath)
    }

    async createPost(payload: PostPayload) {
        return await this.postRequest(this.postsPath, payload)
    }

    async updatePost(postId: number, payload: PostPayload) {
        return await this.putRequest(`${this.postsPath}/${postId}`, payload)
    }

    async patchPost(postId: number, payload: Partial<PostPayload>) {
        return await this.patchRequest(`${this.postsPath}/${postId}`, payload)
    }

    async deletePost(postId: number) {
        return await this.deleteRequest(`${this.postsPath}/${postId}`)
    }
}
