# OpenReview

An open-source, self-hosted AI code review bot. Deploy to Vercel, connect a GitHub App, and get automated PR reviews powered by Claude.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhaydenbleasel%2Fopenreview)

## Features

- **Automated PR reviews** — Triggers on every pull request, reviewing for bugs, security vulnerabilities, performance issues, and code quality
- **On-demand reviews** — Mention `@openreview` in any PR comment to request a review
- **Sandboxed execution** — Runs in an isolated [Vercel Sandbox](https://vercel.com/docs/sandbox) with full repo access, including the ability to run linters, formatters, and tests
- **Inline suggestions** — Posts line-level comments with GitHub suggestion blocks for one-click fixes
- **Code changes** — Can directly fix formatting, lint errors, and simple bugs, then commit and push to your PR branch
- **Durable workflows** — Built on [Vercel Workflow](https://vercel.com/docs/workflow) for reliable, resumable execution
- **Powered by Claude** — Uses Claude Sonnet 4.6 via the [AI SDK](https://sdk.vercel.ai) for high-quality code analysis

## How it works

1. A GitHub webhook fires when a PR is opened or `@openreview` is mentioned in a comment
2. OpenReview spins up a sandboxed environment and clones the repo on the PR branch
3. A Claude-powered agent reviews the diff, explores the codebase, and runs project tooling
4. The agent posts its findings as PR comments with inline suggestions
5. If changes are made (formatting fixes, lint fixes, etc.), they're committed and pushed to the branch
6. The sandbox is cleaned up

## Setup

### 1. Deploy to Vercel

Click the button above or clone this repo and deploy it to your Vercel account.

### 2. Create a GitHub App

Create a new [GitHub App](https://github.com/settings/apps/new) with the following configuration:

**Webhook URL**: `https://your-deployment.vercel.app/api/webhooks`

**Repository permissions**:

- Contents: Read & write
- Issues: Read & write
- Pull requests: Read & write
- Metadata: Read-only

**Subscribe to events**:

- Pull request
- Issue comment

Generate a private key and webhook secret, then note your App ID and Installation ID.

### 3. Configure environment variables

Add the following environment variables to your Vercel project:

| Variable | Description |
| --- | --- |
| `ANTHROPIC_API_KEY` | Your [Anthropic API key](https://console.anthropic.com/) |
| `GITHUB_APP_ID` | The ID of your GitHub App |
| `GITHUB_APP_INSTALLATION_ID` | The installation ID for your repository |
| `GITHUB_APP_PRIVATE_KEY` | The private key generated for your GitHub App (with `\n` for newlines) |
| `GITHUB_APP_WEBHOOK_SECRET` | The webhook secret you configured |
| `REDIS_URL` | (Optional) Redis URL for persistent state. Falls back to in-memory storage |

### 4. Install the GitHub App

Install the GitHub App on the repositories you want OpenReview to monitor. Once installed, OpenReview automatically reviews new PRs and responds to mentions.

## Usage

**Automatic reviews**: Open a PR and OpenReview will review it automatically.

**On-demand reviews**: Comment `@openreview` on any PR to trigger a review. You can include specific instructions:

```
@openreview check for security vulnerabilities
@openreview run the linter and fix any issues
@openreview explain how the authentication flow works
```

**Reactions**: React with 👍 or ❤️ on an OpenReview comment to approve its suggestions. React with 👎 or 😕 to skip.

## Tech stack

- [Next.js](https://nextjs.org) — App framework
- [Vercel Workflow](https://vercel.com/docs/workflow) — Durable execution
- [Vercel Sandbox](https://vercel.com/docs/sandbox) — Isolated code execution
- [AI SDK](https://sdk.vercel.ai) — AI model integration
- [Claude](https://anthropic.com) — Code analysis model
- [Chat SDK](https://www.npmjs.com/package/chat) — GitHub adapter for webhook handling
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client

## Development

```bash
pnpm install
pnpm dev
```

## License

MIT
