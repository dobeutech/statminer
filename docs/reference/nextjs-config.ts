// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  env: {
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_USER: process.env.NEO4J_USER,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'neo4j-driver'];
    return config;
  },
}

module.exports = nextConfig

// package.json
{
  "name": "data-aggregator-chatbot",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@neo4j/graphql": "^5.0.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@tanstack/react-query": "^5.17.0",
    "@vercel/analytics": "^1.1.1",
    "@vercel/kv": "^1.0.1",
    "ai": "^2.2.31",
    "axios": "^1.6.5",
    "chart.js": "^4.4.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "d3": "^7.8.5",
    "date-fns": "^3.2.0",
    "framer-motion": "^10.18.0",
    "lucide-react": "^0.312.0",
    "neo4j-driver": "^5.16.0",
    "next": "14.0.4",
    "next-auth": "^4.24.5",
    "openai": "^4.24.7",
    "react": "^18.2.0",
    "react-chartjs-2": "^5.2.0",
    "react-d3-graph": "^2.6.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "react-markdown": "^9.0.1",
    "recharts": "^2.10.4",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7",
    "uuid": "^9.0.1",
    "zod": "^3.22.4",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.0",
    "@types/d3": "^7.4.3",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.0.4",
    "jest": "^29.7.0",
    "postcss": "^8.4.33",
    "prettier": "^3.2.2",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}