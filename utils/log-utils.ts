import * as winston from 'winston'

export class LogUtils {
    private logger: winston.Logger

    constructor() {
        const logFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} [${level}]: ${stack || message}`
        })

        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
                }),
                new winston.transports.File({
                    filename: `logs/app-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.log`,
                }),
            ],
        })
    }

    public info(message: string): void {
        this.logger.info(message)
    }

    public warn(message: string): void {
        this.logger.warn(message)
    }

    public error(message: string, stack?: string): void {
        this.logger.error(message, stack)
    }

    public trace(message: string): void {
        this.logger.log('silly', message)
    }
}

export const logger = new LogUtils()

export default logger
