# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: StatMiner - Multi-Model AI Chat Aggregator

A comprehensive web application that provides multi-agent AI chat interfaces, integrating multiple LLM providers (OpenAI, Anthropic, OpenRouter, Grok) with Neo4j graph database for data visualization and management.

## Commands

### Development
```bash
npm run dev        # Start Next.js development server on localhost:3000
npm run build      # Build for production (exports to /out for static hosting)
npm run start      # Run production build locally
npm run lint       # Run ESLint
```

### Firebase Deployment
```bash
npm run firebase:serve          # Start Firebase emulators (hosting:5000, firestore:8080, auth:9099, UI:4000)
npm run firebase:deploy         # Build and deploy everything to Firebase
npm run firebase:deploy:hosting # Deploy only hosting
npm run firebase:deploy:functions # Deploy only functions
npm run functions:logs          # View Firebase function logs
```

### Testing
No test framework currently configured. When adding tests, update this section with the appropriate commands.

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router, TypeScript
- **Styling**: Tailwind CSS with Radix UI primitives
- **Database**: Neo4j graph database
- **State Management**: Zustand stores
- **Real-time**: WebSocket connections for streaming chat
- **Visualization**: D3.js, Chart.js, react-d3-graph
- **Animation**: Framer Motion
- **Monitoring**: Sentry integration
- **PWA**: Service worker and offline support

### Key Architecture Patterns

#### Multi-Provider LLM Integration (`src/lib/llm-providers/`)
The system implements a unified interface for multiple LLM providers with:
- Provider-specific classes (OpenAIProvider, AnthropicProvider, etc.)
- Parallel execution across all selected providers using Promise.allSettled
- Both streaming and batch response modes
- Automatic retry logic and error handling
- Cost tracking and token usage monitoring

#### Multi-Agent Chat Interface (`src/components/MultiAgentChat.tsx`)
Core chat interface supports three view modes:
- **Tabs**: Switch between individual agent conversations
- **Quad**: 2x2 grid showing 4 agents simultaneously  
- **Comparison**: Side-by-side response comparison

#### WebSocket Streaming (`src/app/api/ws/chat/`)
Real-time streaming implementation:
- WebSocket endpoint for live chat responses
- Server-sent events for streaming from multiple providers
- Connection management with reconnection logic
- Session persistence across connections

#### Queue System (`src/lib/queue/queue-manager.ts`)
Bull-based job queue for:
- Chat message processing
- Database operations
- Background tasks with retry logic
- Redis-backed persistence

#### Neo4j Integration (`src/lib/neo4j/backup-manager.ts`)
Graph database operations:
- Dataset backup and restoration
- Node and relationship CRUD operations
- Cypher query execution
- Visualization data preparation

### Type System (`src/types/index.ts`)

Comprehensive TypeScript interfaces including:
- **LLMProvider**: Provider configuration and metadata
- **ChatMessage & ChatSession**: Message and conversation state
- **AgentTab**: Multi-agent UI state management
- **Neo4jDataset**: Graph data structures
- **QueuedJob**: Background job definitions
- **WebSocketMessage**: Real-time communication
- **UserSession & UserPreferences**: User state persistence

All types use Zod for runtime validation.

## Build Configuration

### Static Export Setup (`next.config.js`)
- Configured for static export (`output: 'export'`) for Firebase hosting
- Neo4j driver externalized for server components
- WebSocket polyfills for client-side compatibility
- Sentry integration for error tracking

### Firebase Configuration (`firebase.json`)
- Static hosting from `/out` directory
- Function deployment with Node.js 18
- Firestore and Storage rules
- Emulator suite for local development

## Environment Variables

Required in `.env.local`:
```bash
# Neo4j Database (Required)
NEO4J_URI=neo4j+s://[instance].databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=[password]

# LLM Services (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
GROK_API_KEY=...

# NextAuth (Required for auth)
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=[32+ char secret]

# Monitoring (Optional)
SENTRY_ORG=...
SENTRY_PROJECT=...
```

## Development Guidelines

### Adding New LLM Providers
1. Add provider class to `src/lib/llm-providers/index.ts` implementing the ProviderRequest interface
2. Update PROVIDERS registry and provider configuration array
3. Add API key handling in environment schema
4. Test both streaming and batch modes

### Modifying Chat Interface
The chat system is built around the AgentTab concept - each provider gets its own tab/panel:
- Update `MultiAgentChat.tsx` for UI changes
- Modify `useChatStore` for state management
- WebSocket message handling in `useWebSocket` hook

### Neo4j Schema Changes
1. Update interfaces in `src/types/index.ts`
2. Modify backup manager for new data structures
3. Update visualization components for new node/relationship types
4. Test data migration compatibility

## Production Deployment

See `PRODUCTION_CHECKLIST.md` for a comprehensive deployment guide covering:
- Critical pre-launch fixes
- Security hardening
- Infrastructure setup
- CI/CD pipeline configuration
- Monitoring and observability

### Quick Production Commands
```bash
# Generate secrets
openssl rand -base64 32

# Security audit
npm audit

# Build and test
npm run build

# Deploy to Firebase
npm run firebase:deploy

# View function logs
npm run functions:logs
```