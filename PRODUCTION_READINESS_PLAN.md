# StatMiner Production Readiness Plan

> **Comprehensive step-by-step guide from architecture to deployment**
> 
> Generated: December 16, 2024

---

## Executive Summary

After thorough analysis of the StatMiner codebase, this document outlines the path to production-ready deployment. The application is a multi-model AI chat aggregator built with Next.js 14, integrating multiple LLM providers with Neo4j graph database support.

### Current State Assessment

| Category | Status | Priority |
|----------|--------|----------|
| Build System | ❌ Broken | Critical |
| Security | ⚠️ Incomplete | High |
| Authentication | ⚠️ Placeholder | High |
| Infrastructure | ⚠️ Partial | Medium |
| Testing | ❌ Not Configured | Medium |
| Documentation | ✅ Good | Low |

### Critical Blockers Identified

1. **Invalid dependency**: `@radix-ui/react-button` does not exist
2. **Version conflict**: `react-d3-graph@2.6.0` requires D3 v5, but project uses D3 v7
3. **Security vulnerabilities**: Critical CVEs in `next` and `next-auth`
4. **Architecture conflict**: Static export incompatible with API routes
5. **Missing assets**: PWA icons referenced but not present

---

## Phase 1: Critical Fixes (Day 1)

### 1.1 Fix Package Dependencies

**Issue**: `@radix-ui/react-button` package doesn't exist in npm registry.

**Solution**: Replace with `@radix-ui/themes` or use the primitive components.

```json
// package.json - Remove this line:
"@radix-ui/react-button": "^1.0.4",

// Replace with:
"@radix-ui/themes": "^3.0.0",
// Or remove entirely if not used
```

**Verify**:
```bash
npm install --legacy-peer-deps
npm run build
```

### 1.2 Resolve D3 Version Conflict

**Issue**: `react-d3-graph@2.6.0` requires `d3@^5.5.0` but project has `d3@^7.8.5`

**Options**:

| Option | Pros | Cons |
|--------|------|------|
| A: Downgrade D3 to v5 | Quick fix | Lose D3 v7 features |
| B: Replace react-d3-graph | Modern library | Migration effort |
| C: Fork react-d3-graph | Full control | Maintenance burden |

**Recommended (Option B)**: Replace with `@nivo/network` or `react-force-graph`

```json
// package.json
// Remove:
"react-d3-graph": "^2.6.0",

// Add:
"react-force-graph-2d": "^1.25.0",
```

### 1.3 Update Vulnerable Packages

**Current Vulnerabilities**:
- `next`: Critical RCE vulnerability (GHSA-9qr9-h5gf-34mp)
- `next-auth@<4.24.12`: Email misdelivery (GHSA-5jpx-9hw9-2fx4)

**Solution**:
```bash
# Update next-auth first (has fix available)
npm install next-auth@latest

# For Next.js, update to latest stable
npm install next@14.2.20
```

**Note**: The Next.js vulnerability affects 15.x series; version 14.x should be unaffected. Verify with:
```bash
npm audit
```

### 1.4 Create Missing PWA Assets

**Required Icons** (referenced in `public/manifest.json`):

| Size | Filename | Purpose |
|------|----------|---------|
| 72x72 | icon-72.png | Android small |
| 96x96 | icon-96.png | Android medium |
| 128x128 | icon-128.png | Web |
| 144x144 | icon-144.png | Android splash |
| 152x152 | icon-152.png | iOS home |
| 192x192 | icon-192.png | Android home |
| 384x384 | icon-384.png | Large displays |
| 512x512 | icon-512.png | Store listing |

**Also needed**:
- `/public/favicon.ico` (32x32 or 16x16)
- `/public/screenshot-1.png` (1280x720)
- `/public/screenshot-2.png` (1280x720)

**Quick generation using placeholder**:
```bash
# Install imagemagick if needed
sudo apt-get install imagemagick

# Create placeholder icon (cyan background with "SM" text)
for size in 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:#06b6d4 \
    -gravity center -pointsize $((size/4)) -fill white \
    -annotate 0 "SM" public/icon-${size}.png
done
```

### 1.5 Resolve Architecture Conflict

**Issue**: `next.config.js` uses `output: 'export'` (static) but the app has API routes that require a server.

**Current Configuration**:
```javascript
// next.config.js
output: 'export',
```

**Affected API Routes**:
- `/api/auth/[...nextauth]/route.ts`
- `/api/ws/chat/route.ts`
- `/api/health/route.ts`
- `/api/session/route.ts`
- `/api/webhooks/route.ts`
- `/api/test-api-key/route.ts`

**Options**:

| Option | Architecture | Deployment Target |
|--------|-------------|-------------------|
| A: Keep Static | Static frontend + Firebase Functions for API | Firebase Hosting |
| B: Switch to SSR | Full Next.js server | Vercel, Railway, EC2 |
| C: Hybrid | Static + External WebSocket Service | Firebase + Ably/Pusher |

**Recommended (Option A)**: Keep static export for hosting, move API logic to Firebase Functions.

**Implementation**:

1. Remove API routes from Next.js (they won't work with static export anyway)
2. Expand Firebase Functions to handle all API logic
3. Update frontend to call Firebase Functions endpoints

```javascript
// next.config.js - Keep static export
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};
```

```typescript
// functions/src/index.ts - Add chat endpoint
export const chat = onRequest(async (req, res) => {
  // Move logic from /api/ws/chat/route.ts
});
```

---

## Phase 2: Security Hardening (Day 2-3)

### 2.1 Create Rate Limiting Middleware

**Issue**: No rate limiting exists; API abuse is possible.

**Implementation**:

```typescript
// src/middleware.ts (NEW FILE)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimit = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (entry && now < entry.resetTime) {
    if (entry.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((entry.resetTime - now) / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000)) } }
      );
    }
    entry.count++;
  } else {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  // Clean up old entries periodically
  if (rateLimit.size > 10000) {
    for (const [key, value] of rateLimit.entries()) {
      if (now > value.resetTime) rateLimit.delete(key);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### 2.2 Implement Webhook Signature Verification

**Issue**: Current implementation is a placeholder returning `true`.

**Location**: `functions/src/index.ts`

```typescript
// Replace the placeholder function with actual verification
import * as crypto from 'crypto';

function verifyWebhookSignature(
  payload: any, 
  signature: string, 
  secret: string = process.env.WEBHOOK_SECRET || ''
): boolean {
  if (!signature || !secret) {
    console.warn('Missing signature or webhook secret');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
```

### 2.3 Add Security Headers

**Update**: `next.config.js`

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com https://openrouter.ai https://api.x.ai wss:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

module.exports = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 2.4 Configure Production CORS

**Update**: `functions/src/index.ts`

```typescript
// Replace permissive CORS with production whitelist
const allowedOrigins = [
  'https://statminer.app',
  'https://www.statminer.app',
  // Add staging domain if needed
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
].filter(Boolean);

const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
});
```

### 2.5 Add Request Validation Middleware

**Create**: `src/lib/validation/request-validator.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export function validateRequest<T>(
  schema: ZodSchema<T>
) {
  return async (request: NextRequest): Promise<{ data: T } | NextResponse> => {
    try {
      const body = await request.json();
      const data = schema.parse(body);
      return { data };
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  };
}
```

---

## Phase 3: Authentication (Day 3-4)

### 3.1 Configure OAuth Providers

**Update**: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    // Optional: Allow API key-based anonymous sessions
    CredentialsProvider({
      name: 'API Key',
      credentials: {
        apiKeyId: { label: 'Session ID', type: 'text' },
      },
      async authorize(credentials) {
        if (credentials?.apiKeyId) {
          return {
            id: credentials.apiKeyId,
            name: 'Anonymous User',
            email: null,
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
        token.provider = account?.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.userId;
        (session as any).provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    signOut: '/auth/signout',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 3.2 Create Auth Pages

**Create**: `src/app/auth/signin/page.tsx`

```typescript
'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function SignIn() {
  const [providers, setProviders] = useState<any>(null);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Welcome to StatMiner</h2>
          <p className="mt-2 text-gray-400">Sign in to continue</p>
        </div>
        
        <div className="space-y-4">
          {providers && Object.values(providers).map((provider: any) => (
            provider.id !== 'credentials' && (
              <button
                key={provider.name}
                onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors"
              >
                Continue with {provider.name}
              </button>
            )
          ))}
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Or continue without signing in using your own API keys</p>
        </div>
      </div>
    </div>
  );
}
```

### 3.3 Update Environment Template

**Update**: `.env.production.example`

Add OAuth configuration section if not already present (already exists in current file).

---

## Phase 4: Infrastructure Setup (Day 4-5)

### 4.1 Configure Sentry for Production

**Update**: `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Reduce sample rate in production for cost savings
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Only replay on errors in production
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  
  debug: process.env.NODE_ENV === 'development',
  
  // Environment tagging
  environment: process.env.NODE_ENV || 'development',
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      delete headers['authorization'];
      delete headers['x-api-key'];
      delete headers['cookie'];
      event.request.headers = headers;
    }
    
    // Don't send in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Event (dev):', event.message || event.exception);
      return null;
    }
    
    return event;
  },
  
  // Ignore common non-actionable errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'Load failed',
  ],
});
```

### 4.2 Create Firebase Deployment Workflow

**Create**: `.github/workflows/deploy-firebase.yml`

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main, master]
  workflow_dispatch:

env:
  NODE_VERSION: '18'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: live

      - name: Deploy Firebase Functions
        run: |
          npm install -g firebase-tools
          cd functions && npm ci && npm run build
          firebase deploy --only functions --token "${{ secrets.FIREBASE_TOKEN }}"
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### 4.3 Neo4j Production Indexes

**Create**: `neo4j/production-indexes.cypher`

```cypher
// Performance indexes for production
CREATE INDEX node_id IF NOT EXISTS FOR (n:Node) ON (n.id);
CREATE INDEX dataset_id IF NOT EXISTS FOR (d:Dataset) ON (d.id);
CREATE INDEX message_timestamp IF NOT EXISTS FOR (m:Message) ON (m.timestamp);
CREATE INDEX user_id IF NOT EXISTS FOR (u:User) ON (u.id);
CREATE INDEX session_created IF NOT EXISTS FOR (s:Session) ON (s.createdAt);

// Full-text search indexes
CREATE FULLTEXT INDEX message_content IF NOT EXISTS 
FOR (m:Message) ON EACH [m.content];

// Constraints for data integrity
CREATE CONSTRAINT unique_user_id IF NOT EXISTS 
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT unique_session_id IF NOT EXISTS 
FOR (s:Session) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT unique_dataset_id IF NOT EXISTS 
FOR (d:Dataset) REQUIRE d.id IS UNIQUE;
```

---

## Phase 5: Testing Setup (Day 5-6)

### 5.1 Install Testing Framework

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom \
  jest-environment-jsdom @types/jest ts-jest @testing-library/user-event
```

### 5.2 Configure Jest

**Create**: `jest.config.js`

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/functions/',
    '<rootDir>/out/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

**Create**: `jest.setup.js`

```javascript
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
}));

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
```

### 5.3 Example Test - LLM Provider

**Create**: `src/lib/llm-providers/__tests__/index.test.ts`

```typescript
import { sendToLLMProviders } from '../index';

// Mock fetch
global.fetch = jest.fn();

describe('LLM Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('should return empty array when no providers are selected', async () => {
    const result = await sendToLLMProviders('Hello', []);
    expect(result).toEqual([]);
  });

  it('should call OpenAI API when openai provider is selected', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello!' } }],
        usage: { total_tokens: 10 },
      }),
    });

    const result = await sendToLLMProviders('Hello', ['openai']);
    
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
        }),
      })
    );
    
    expect(result).toHaveLength(1);
    expect(result[0].response).toBe('Hello!');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(sendToLLMProviders('Hello', ['openai']))
      .rejects
      .toThrow('OpenAI API error: 500');
  });
});
```

### 5.4 Update package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

### 5.5 Enable Tests in CI

**Update**: `.github/workflows/ci.yml`

```yaml
  test:
    name: Test
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false
```

---

## Phase 6: Polish & Documentation (Day 6-7)

### 6.1 Add Structured Logging

**Create**: `src/lib/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: any;
}

const formatLog = (entry: LogEntry): string => {
  return JSON.stringify(entry);
};

export const logger = {
  debug: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },

  info: (message: string, meta?: object) => {
    console.log(formatLog({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  warn: (message: string, meta?: object) => {
    console.warn(formatLog({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  error: (message: string, error?: Error, meta?: object) => {
    console.error(formatLog({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  // Request logging helper
  request: (req: Request, meta?: object) => {
    const url = new URL(req.url);
    console.log(formatLog({
      level: 'info',
      message: 'HTTP Request',
      method: req.method,
      path: url.pathname,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
};
```

### 6.2 Complete LLM Provider Implementation

The current implementation in `functions/src/index.ts` has placeholder code. Update with actual implementation:

```typescript
// functions/src/index.ts - Update forwardToLLMProviders
async function forwardToLLMProviders(
  message: string, 
  providers: string[]
): Promise<LLMResponse[]> {
  const results: LLMResponse[] = [];
  
  const providerConfigs: Record<string, ProviderConfig> = {
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview',
    },
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-opus-20240229',
    },
    // Add more providers...
  };

  const requests = providers
    .filter(id => providerConfigs[id]?.apiKey)
    .map(async (providerId) => {
      const config = providerConfigs[providerId];
      const startTime = Date.now();
      
      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: getProviderHeaders(providerId, config.apiKey),
          body: JSON.stringify(getProviderBody(providerId, message, config.model)),
        });
        
        if (!response.ok) {
          throw new Error(`${providerId} API error: ${response.status}`);
        }
        
        const data = await response.json();
        const content = extractContent(providerId, data);
        
        return {
          providerId,
          response: content,
          metadata: {
            tokensUsed: extractTokenCount(providerId, data),
            responseTime: Date.now() - startTime,
            cost: calculateCost(providerId, data),
          },
        };
      } catch (error) {
        console.error(`Error from ${providerId}:`, error);
        return {
          providerId,
          response: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            cost: 0,
          },
        };
      }
    });

  const responses = await Promise.allSettled(requests);
  
  return responses
    .filter((r): r is PromiseFulfilledResult<LLMResponse> => r.status === 'fulfilled')
    .map(r => r.value);
}
```

---

## Deployment Checklist

### Pre-Deployment Verification

```bash
# 1. Verify all dependencies install correctly
npm ci --legacy-peer-deps

# 2. Run linting
npm run lint

# 3. Run type checking
npx tsc --noEmit

# 4. Run tests
npm test

# 5. Build successfully
npm run build

# 6. Security audit
npm audit

# 7. Check for environment variables
cat .env.production.example
```

### Required Secrets for GitHub Actions

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON | Firebase Console → Project Settings → Service Accounts |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project Settings |
| `FIREBASE_TOKEN` | Firebase CLI token | `firebase login:ci` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | Sentry → Project Settings → Client Keys |
| `SENTRY_ORG` | Sentry organization slug | Sentry → Organization Settings |
| `SENTRY_PROJECT` | Sentry project slug | Sentry → Project Settings |
| `CODECOV_TOKEN` | Codecov upload token | Codecov → Repository Settings |

### Production Environment Variables

Set these in your hosting platform (Firebase/Vercel):

```bash
# Required
NEO4J_URI=neo4j+s://xxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<secure-password>
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<32-char-random-string>

# At least one LLM provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# OAuth (optional but recommended)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Security
WEBHOOK_SECRET=<32-char-random-string>
```

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1: Critical Fixes | Day 1 | Working build, resolved vulnerabilities |
| 2: Security | Day 2-3 | Rate limiting, CORS, security headers |
| 3: Authentication | Day 3-4 | OAuth providers, auth pages |
| 4: Infrastructure | Day 4-5 | Sentry, CI/CD, database indexes |
| 5: Testing | Day 5-6 | Jest setup, unit tests, CI integration |
| 6: Polish | Day 6-7 | Logging, documentation, final review |

**Total Estimated Time**: 7 working days

---

## Post-Launch Monitoring

1. **First 24 hours**: Monitor error rates, response times, and API costs
2. **First week**: Review user feedback, fix critical bugs
3. **Ongoing**: 
   - Weekly dependency updates
   - Monthly security audits
   - Quarterly performance reviews

---

*Document generated by codebase analysis. Review and adjust based on your specific requirements.*
