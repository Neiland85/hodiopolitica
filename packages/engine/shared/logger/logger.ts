/**
 * Structured logger for the engine.
 *
 * Outputs JSON-formatted log lines for easy parsing by log aggregators.
 * Supports log levels and contextual metadata.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: Record<string, unknown>
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export class Logger {
  private readonly module: string
  private readonly minLevel: LogLevel

  constructor(module: string, minLevel: LogLevel = 'info') {
    this.module = module
    this.minLevel = minLevel
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data)
  }

  child(subModule: string): Logger {
    return new Logger(`${this.module}.${subModule}`, this.minLevel)
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      ...(data && { data }),
    }

    const output = JSON.stringify(entry)

    if (level === 'error') {
      console.error(output)
    } else if (level === 'warn') {
      console.warn(output)
    } else {
      console.log(output)
    }
  }
}

/**
 * Factory function — creates a logger scoped to a module.
 */
export function createLogger(module: string, level?: LogLevel): Logger {
  const envLevel = (process.env.LOG_LEVEL as LogLevel) || level || 'info'
  return new Logger(module, envLevel)
}
