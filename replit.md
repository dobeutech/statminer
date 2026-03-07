# StatMiner

Multi-model AI data aggregator chatbot with real-time streaming, built with Next.js 14 (App Router).

## Architecture

- **Framework**: Next.js 14.2 with App Router, TypeScript
- **State Management**: Zustand with localStorage persistence (API keys excluded from persistence for security)
- **Styling**: Tailwind CSS + Framer Motion for animations
- **UI Components**: Radix UI (Tabs, Dialog)
- **Data Visualization**: Chart.js, D3.js
- **Database**: Neo4j (graph database for dataset relationships)
- **Auth**: NextAuth.js (JWT strategy)
- **Real-time**: Socket.IO / WebSocket with HTTP fallback

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── page.tsx          # Home page with multi-agent chat
│   ├── layout.tsx        # Root layout (PWA, fonts, meta)
│   └── api/
│       ├── auth/         # NextAuth endpoints
│       ├── health/       # Health check endpoint
│       ├── session/      # Session management (authenticated)
│       ├── test-api-key/  # API key validation (authenticated)
│       ├── webhooks/     # Webhook registration & delivery
│       └── ws/chat/      # WebSocket endpoint for streaming
├── components/           # React components
│   ├── MultiAgentChat.tsx  # Core multi-agent chat interface
│   ├── ChatInput.tsx     # Chat input component
│   ├── MessageList.tsx   # Message display
│   ├── ProviderSelector.tsx # LLM provider selection
│   ├── ApiKeyPrompt.tsx  # API key configuration dialog
│   ├── PWAProvider.tsx   # PWA registration
│   └── UserDashboard.tsx # User dashboard
├── lib/
│   ├── auth/             # Session manager & API key validation
│   ├── hooks/            # Custom hooks (useWebSocket)
│   ├── llm-providers/    # LLM provider implementations (OpenAI, Anthropic, OpenRouter, Grok)
│   ├── neo4j/            # Neo4j backup manager
│   ├── pwa/              # PWA service worker registration
│   ├── queue/            # In-memory job queue
│   └── stores/           # Zustand stores
└── types/                # TypeScript types & Zod schemas
```

## Key Files

- `next.config.js` — Next.js configuration (server components external packages, webpack fallbacks)
- `package.json` — Dependencies and scripts
- `tsconfig.json` — TypeScript configuration with `@/` path alias
- `tailwind.config.js` — Tailwind CSS configuration
- `postcss.config.js` — PostCSS configuration

## Scripts

- `npm run dev` — Development server on port 5000
- `npm run build` — Production build
- `npm run start` — Production server on port 5000
- `npm run lint` — ESLint
- `npm test` — Jest tests

## Environment Variables

Required secrets (configured via Replit Secrets):
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` — Neo4j database
- `OPENAI_API_KEY` — OpenAI API
- `ANTHROPIC_API_KEY` — Anthropic API
- `NEXTAUTH_SECRET` — NextAuth session signing

Optional:
- `OPENROUTER_API_KEY`, `GROK_API_KEY` — Additional LLM providers
- Various government/academic API keys (Census, BLS, FRED, etc.)

## Security Notes

- API keys are NOT persisted to localStorage (excluded from Zustand persistence)
- All API routes require NextAuth authentication
- Neo4j queries use parameterized inputs (no string interpolation)
- Webhook URLs validated against SSRF (HTTPS only, no internal IPs)
- `.env.local` removed — all secrets in Replit's secure store

## Deployment

- Target: Autoscale
- Build: `npm run build`
- Run: `npm run start`
- Port: 5000
