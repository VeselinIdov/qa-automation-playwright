import { faker } from '@faker-js/faker'

export function randomUserId() {
    return faker.number.int({ min: 1, max: 10 })
}

export function randomTitle() {
    return faker.lorem.words({ min: 2, max: 6 })
}

export function randomBody() {
    return faker.lorem.paragraph({ min: 1, max: 3 })
}
