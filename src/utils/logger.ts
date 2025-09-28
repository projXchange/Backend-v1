import pino from 'pino';

// Environment-specific configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Log level configuration
const getLogLevel = (): string => {
  if (isTest) return 'silent';
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  return isDevelopment ? 'info' : 'info'; // Reduced from 'debug' to 'info' for less verbose logging
};

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: getLogLevel(),
  
  // Add timestamp and service info to all logs
  base: {
    pid: process.pid,
    service: 'projxchange-backend',
    version: process.env.npm_package_version || '1.0.0',
  },

  // Format timestamps in a readable way
  timestamp: pino.stdTimeFunctions.isoTime,

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

// Development configuration with pretty printing - single line format
const developmentConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname,service,version,requestId,method,url,path,ip,userAgent,contentType,contentLength,statusCode,duration,userId,email',
      messageFormat: '{msg}',
      singleLine: true,
    },
  },
};

// Production configuration with structured JSON logging
const productionConfig: pino.LoggerOptions = {
  ...baseConfig,
  // In production, we want structured JSON logs for log aggregation tools
  formatters: {
    level: (label) => ({ level: label }),
  },
};

// Create the logger instance
const logger = pino(isDevelopment ? developmentConfig : productionConfig);

// Enhanced logging methods with context
interface LogContext {
  requestId?: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  url?: string;
  [key: string]: any;
}

class Logger {
  private pino: pino.Logger;

  constructor(pinoInstance: pino.Logger) {
    this.pino = pinoInstance;
  }

  // Create child logger with context
  child(context: LogContext) {
    return new Logger(this.pino.child(context));
  }

  // Debug level logging
  debug(message: string, context?: LogContext) {
    this.pino.debug(context, message);
  }

  // Info level logging  
  info(message: string, context?: LogContext) {
    this.pino.info(context, message);
  }

  // Warning level logging
  warn(message: string, context?: LogContext) {
    this.pino.warn(context, message);
  }

  // Error level logging
  error(message: string, error?: Error | LogContext, context?: LogContext) {
    if (error instanceof Error) {
      this.pino.error({ err: error, ...context }, message);
    } else {
      this.pino.error(error, message);
    }
  }

  // Fatal level logging
  fatal(message: string, error?: Error | LogContext, context?: LogContext) {
    if (error instanceof Error) {
      this.pino.fatal({ err: error, ...context }, message);
    } else {
      this.pino.fatal(error, message);
    }
  }

  // Trace level logging
  trace(message: string, context?: LogContext) {
    this.pino.trace(context, message);
  }

  // HTTP request logging
  http(message: string, context: LogContext) {
    const level = this.getHttpLogLevel(context.statusCode);
    this.pino[level](context, message);
  }

  // Authentication related logging
  auth(message: string, context: LogContext) {
    this.info(`🔐 ${message}`, context);
  }

  // Database related logging
  db(message: string, context?: LogContext) {
    this.debug(`🗄️ ${message}`, context);
  }

  // Email related logging
  email(message: string, context?: LogContext) {
    this.info(`📧 ${message}`, context);
  }

  // Payment/Transaction logging
  payment(message: string, context?: LogContext) {
    this.info(`💳 ${message}`, context);
  }


  // Security related logging
  security(message: string, context?: LogContext) {
    this.warn(`🛡️ ${message}`, context);
  }

  // Performance monitoring
  performance(message: string, context?: LogContext) {
    this.debug(`⚡ ${message}`, context);
  }

  private getHttpLogLevel(statusCode?: number): 'info' | 'warn' | 'error' {
    if (!statusCode) return 'info';
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  // Get the underlying pino instance for advanced usage
  getPino(): pino.Logger {
    return this.pino;
  }
}

// Create and export the main logger instance
const mainLogger = new Logger(logger);

export { Logger, mainLogger as logger, LogContext };

// Export convenience methods for backward compatibility
export const log = {
  debug: (message: string, context?: LogContext) => mainLogger.debug(message, context),
  info: (message: string, context?: LogContext) => mainLogger.info(message, context),
  warn: (message: string, context?: LogContext) => mainLogger.warn(message, context),
  error: (message: string, error?: Error | LogContext, context?: LogContext) => 
    mainLogger.error(message, error, context),
  fatal: (message: string, error?: Error | LogContext, context?: LogContext) => 
    mainLogger.fatal(message, error, context),
  trace: (message: string, context?: LogContext) => mainLogger.trace(message, context),
  http: (message: string, context: LogContext) => mainLogger.http(message, context),
  auth: (message: string, context: LogContext) => mainLogger.auth(message, context),
  db: (message: string, context?: LogContext) => mainLogger.db(message, context),
  email: (message: string, context?: LogContext) => mainLogger.email(message, context),
  payment: (message: string, context?: LogContext) => mainLogger.payment(message, context),
  security: (message: string, context?: LogContext) => mainLogger.security(message, context),
  performance: (message: string, context?: LogContext) => mainLogger.performance(message, context),
};

export default mainLogger;