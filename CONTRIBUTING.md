# Contributing to StatMiner

Thank you for your interest in contributing to StatMiner! This document provides guidelines and instructions for contributing to the project.

## Development Workflow

### Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run tests: `npm test`
7. Run linting: `npm run lint`
8. Commit your changes with a descriptive message
9. Push to your fork and submit a pull request

### Branch Naming

- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring
- `test/` — Adding or updating tests

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add OpenRouter provider support
fix: resolve WebSocket reconnection issue
docs: update API key configuration guide
test: add unit tests for message validation
refactor: simplify LLM provider manager
```

## Code Standards

### TypeScript

- Use strict TypeScript with no `any` types where possible
- Define interfaces for all data structures in `src/types/index.ts`
- Use Zod schemas for runtime validation of external inputs

### React Components

- Use functional components with hooks
- Place components in `src/components/`
- Keep components focused — one responsibility per component
- Use Zustand for shared state management

### API Routes

- Place API routes under `src/app/api/`
- Validate all request bodies with Zod schemas
- Include proper error handling and status codes
- Authenticate requests where required

### Styling

- Use Tailwind CSS utility classes
- Follow the existing color scheme and design patterns
- Use `clsx` and `tailwind-merge` for conditional class names

## Testing

### Running Tests

```bash
npm test
```

### Writing Tests

- Place unit tests in `tests/unit/`
- Place integration tests in `tests/integration/`
- Follow the naming convention: `*.test.ts` or `*.test.tsx`
- Test validation schemas, utility functions, and API endpoints
- Aim for meaningful coverage of critical paths

## Adding a New LLM Provider

1. Add the provider configuration to `src/lib/llm-providers/index.ts`
2. Define the provider's API key field in `ApiKeyConfigSchema` in `src/types/index.ts`
3. Update the `ProviderSelector` component if needed
4. Add tests for the new provider
5. Document the provider in the README

## Adding a New Data Source

1. Define the `DatabaseConfig` entry in `src/types/index.ts`
2. Specify endpoints, methods, parameters, and rate limits
3. Test the integration with sample queries
4. Document the data source in the README

## Security

- Never commit API keys, passwords, or secrets to the repository
- Use environment variables for all sensitive configuration
- Validate and sanitize all user inputs
- Report security vulnerabilities to jeremyw@dobeu.net (see [SECURITY.md](SECURITY.md))

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Verify all tests pass and linting is clean
3. Provide a clear description of the changes in the PR
4. Reference any related issues
5. Wait for code review and address any feedback

## Questions?

If you have questions about contributing, open an issue or reach out to the maintainers.
