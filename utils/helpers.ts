import * as fs from 'node:fs'

export function getCurrentQuarter(): string {
    const month = new Date().getMonth()
    const year = new Date().getFullYear()

    switch (true) {
        case month >= 0 && month <= 2:
            return `Q1 ${year} (Jan - Mar)`
        case month >= 3 && month <= 5:
            return `Q2 ${year} (Apr - Jun)`
        case month >= 6 && month <= 8:
            return `Q3 ${year} (Jul - Sep)`
        case month >= 9 && month <= 11:
            return `Q4 ${year} (Oct - Dec)`
        default:
            throw new Error('Invalid month value')
    }
}

export function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export function getCurrentMonth(): string {
    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ]
    return months[new Date().getMonth()]
}

export function deleteFileIfExists(filePath: string) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }
}
