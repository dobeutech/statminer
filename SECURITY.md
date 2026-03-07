# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in StatMiner, please report it responsibly.

**Contact:** [jeremyw@dobeu.net](mailto:jeremyw@dobeu.net)

Please include:
- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes (optional)

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Best Practices

- Never commit `.env.local` or any file containing real credentials.
- Store all secrets in Replit's secret store (or your hosting provider's equivalent).
- API keys provided by users are stored in-memory only and never persisted to disk or localStorage.
- All API routes that access user data require authentication via NextAuth sessions.
- Webhook URLs are validated to prevent SSRF attacks.
- Neo4j queries use parameterized inputs to prevent injection.
