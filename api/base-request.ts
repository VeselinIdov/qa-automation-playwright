import { APIRequestContext } from '@playwright/test'
import logger from '../utils/log-utils'

export class BaseRequest {
    private readonly api: APIRequestContext

    constructor(api: APIRequestContext) {
        this.api = api
    }

    protected authHeaders(token: string) {
        if (!token || token.trim() === '') {
            throw new Error('SECRET_KEY is missing or empty. Check your .env file.')
        }
        return { Authorization: `Bearer ${token}` }
    }

    getRequest(path: string, token: string) {
        logger.info(`Sending GET request to: ${path}`)
        return this.api.get(path, { headers: this.authHeaders(token) })
    }

    postRequest(path: string, payload: object, token: string) {
        logger.info(`Sending POST request to: ${path}`)
        return this.api.post(path, {
            data: payload,
            headers: this.authHeaders(token),
        })
    }

    putRequest(path: string, payload: object, token: string) {
        logger.info(`Sending PUT request to: ${path}`)
        return this.api.put(path, {
            data: payload,
            headers: this.authHeaders(token),
        })
    }

    patchRequest(path: string, payload: object, token: string) {
        logger.info(`Sending PATCH request to: ${path}`)
        return this.api.patch(path, {
            data: payload,
            headers: this.authHeaders(token),
        })
    }

    deleteRequest(path: string, token: string) {
        logger.info(`Sending DELETE request to: ${path}`)
        return this.api.delete(path, {
            headers: this.authHeaders(token)
        })
    }
}
