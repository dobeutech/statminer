# StatMiner

A comprehensive web-based data aggregator chatbot with multi-LLM support, built with Next.js. StatMiner enables users to interact with multiple AI language models simultaneously, aggregate data from public datasets, and visualize results through an intuitive interface.

## Features

- **Multi-Model Chat**: Interact with multiple LLM providers (OpenAI, Anthropic, OpenRouter, Grok, Requesty) in parallel
- **Tabbed & Quad View**: View AI responses side-by-side or in tabbed mode for easy comparison
- **Data Aggregation**: Connect to public data APIs including US Census Bureau and more
- **Neo4j Integration**: Store and query knowledge graphs for enriched data relationships
- **Real-Time Streaming**: WebSocket-based streaming responses from LLM providers
- **Progressive Web App**: Install as a PWA for offline access and native-like experience
- **Session Management**: Persistent chat sessions with history and preferences
- **Data Visualization**: Built-in charting with Chart.js and D3.js for statistical data
- **Citation Formatting**: Automatic citation generation for data sources

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: Neo4j (graph database)
- **Authentication**: NextAuth.js
- **UI Components**: Radix UI, Lucide React, Framer Motion
- **Visualization**: Chart.js, D3.js
- **Validation**: Zod
- **Logging**: Pino

## Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) Neo4j database instance
- API keys for at least one LLM provider

## Installation

### On Replit

1. Fork or import this repository into Replit
2. Add your secrets via the Replit Secrets panel (see [Environment Variables](#environment-variables))
3. Click **Run** — the app will install dependencies and start automatically on port 5000

### Local Development

```bash
git clone <repository-url>
cd statminer
npm install
cp .env.example .env.local
# Fill in your API keys and configuration in .env.local
npm run dev
```

The development server will start at `http://localhost:5000`.

## Environment Variables

Create a `.env.example` file or set these in the Replit Secrets panel:

| Variable | Description | Required |
|---|---|---|
| `NEXTAUTH_URL` | Base URL of the app (e.g., `https://your-app.replit.app`) | Yes |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session encryption | Yes |
| `NODE_ENV` | `development` or `production` | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `NEO4J_URI` | Neo4j connection URI | Optional |
| `NEO4J_USER` | Neo4j username | Optional |
| `NEO4J_PASSWORD` | Neo4j password | Optional |

At least one LLM provider API key is required for chat functionality.

## Dataset Integration

StatMiner supports connecting to public data APIs for statistical analysis:

- **US Census Bureau**: American Community Survey data
- **Additional sources**: Extend by adding configurations to `DATABASE_CONFIGS` in `src/types/index.ts`

To add a new data source:

1. Define the database configuration in `src/types/index.ts` following the `DatabaseConfig` interface
2. Specify the API endpoint, HTTP method, parameters, and rate limits
3. The LLM agents can then query and analyze data from the configured sources

## Usage

1. **Select Providers**: Choose one or more LLM providers from the sidebar
2. **Configure API Keys**: Enter your API keys when prompted (stored securely in-memory)
3. **Start Chatting**: Send messages and receive responses from all selected providers
4. **Compare Responses**: Use quad view or comparison mode to see responses side-by-side
5. **Visualize Data**: Statistical responses are automatically charted when applicable

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 5000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server on port 5000 |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints (auth, health, session, webhooks, ws)
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── MultiAgentChat.tsx # Main chat interface
│   ├── ChatInput.tsx      # Message input component
│   ├── MessageList.tsx    # Message display
│   ├── ProviderSelector.tsx # LLM provider selection
│   └── UserDashboard.tsx  # User dashboard
├── lib/                   # Shared libraries
│   ├── auth/             # Session management
│   ├── hooks/            # Custom React hooks
│   ├── llm-providers/    # LLM provider manager
│   ├── neo4j/            # Neo4j database integration
│   ├── pwa/              # PWA service worker registration
│   ├── queue/            # Job queue manager
│   └── stores/           # Zustand state stores
└── types/                # TypeScript type definitions
```

## Deployment

### Replit Deployment

1. Ensure all secrets are configured in the Replit Secrets panel
2. Use the **Deploy** button in Replit
3. Select **Autoscale** deployment target
4. Build command: `npm run build`
5. Run command: `npm run start`

### Other Platforms

Build the production bundle and serve:

```bash
npm run build
npm run start
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Copyright (c) 2026 Dobeu Tech Solutions
