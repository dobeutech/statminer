import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${ip}:${request.nextUrl.pathname}`;
}

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > maxRequests;
}

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/test-api-key': { max: 10, windowMs: 60_000 },
  '/api/webhooks': { max: 30, windowMs: 60_000 },
  '/api/chat': { max: 60, windowMs: 60_000 },
};

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'on',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rateConfig = Object.entries(RATE_LIMITS).find(([path]) =>
      pathname.startsWith(path)
    );

    if (rateConfig) {
      const [, { max, windowMs }] = rateConfig;
      const key = getRateLimitKey(request);

      if (isRateLimited(key, max, windowMs)) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
              ...SECURITY_HEADERS,
            },
          }
        );
      }
    }
  }

  const response = NextResponse.next();

  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXTAUTH_URL,
      'http://localhost:5000',
      'http://localhost:3000',
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icon-|og.png).*)',
  ],
};
