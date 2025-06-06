import * as winston from 'winston'

const { combine, timestamp, printf, colorize } = winston.format

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`
  if (Object.keys(metadata).length) {
    msg += ` ${JSON.stringify(metadata)}`
  }
  return msg
})

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), colorize(), logFormat),
  transports: [new winston.transports.Console()],
})

export function setLogLevel(level: string): void {
  logger.level = level
}

export default logger
