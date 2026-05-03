import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'apiKey',
      'api_key',
      'password',
      'secret',
      'NEXTAUTH_SECRET',
      'NEO4J_PASSWORD',
      'WEBHOOK_SECRET',
      'authorization',
      '["x-api-key"]',
      '*.apiKey',
      '*.password',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
