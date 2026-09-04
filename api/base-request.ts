import { APIRequestContext } from '@playwright/test'
import logger from '../utils/log-utils'

export class BaseRequest {
    private readonly api: APIRequestContext

    constructor(api: APIRequestContext) {
        this.api = api
    }

    getRequest(path: string) {
        logger.info(`Sending GET request to: ${path}`)
        return this.api.get(path)
    }

    postRequest(path: string, payload: object) {
        logger.info(`Sending POST request to: ${path}`)
        return this.api.post(path, { data: payload })
    }

    putRequest(path: string, payload: object) {
        logger.info(`Sending PUT request to: ${path}`)
        return this.api.put(path, { data: payload })
    }

    patchRequest(path: string, payload: object) {
        logger.info(`Sending PATCH request to: ${path}`)
        return this.api.patch(path, { data: payload })
    }

    deleteRequest(path: string) {
        logger.info(`Sending DELETE request to: ${path}`)
        return this.api.delete(path)
    }
}
