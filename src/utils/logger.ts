import winston from 'winston';
import path from 'path';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss DD-MM-YYYY' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, context, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]${context ? ` [${context}]` : ''} ${message}${stack ? `\n${stack}` : ''}`;
    })
  ),
  defaultMeta: { service: 'hanoservices-api' },
  transports: [
    new winston.transports.File({ 
      filename: path.join('logs', 'error_logs.txt'), 
      level: 'error' 
    }),
    new winston.transports.File({ filename: path.join('logs', 'combined.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

/**
 * Helper function to log errors with context
 * @param message The error message
 * @param context The file, controller, or service name
 */
export const logError = (message: string, context: string) => {
  logger.error(message, { context });
};

export default logger;
