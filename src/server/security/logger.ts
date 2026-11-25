// Structured logging with Pino — server-only
import 'server-only';

import pino from 'pino';

// Redact sensitive fields from logs
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'privateKey',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_APP_PRIVATE_KEY',
  'BETTER_AUTH_SECRET',
  'DATABASE_URL',
  'webhookSecret',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

export function createChildLogger(component: string) {
  return logger.child({ component });
}
