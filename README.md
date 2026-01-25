# GitHub Follower Tracker

Track GitHub follower changes and get notified via Discord or Slack webhooks.

## Features

- Tracks follower gains and losses for multiple GitHub users
- Sends notifications to Discord or Slack webhooks
- Optimized API usage - skips full pagination when no changes detected
- Configurable follower limit for users with large followings
- Docker support with optional built-in cron scheduling

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL database

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/follower_tracker
GITHUB_TOKEN=ghp_xxxx          # Optional: increases rate limit from 60 to 5000 req/hr
MAX_FOLLOWERS=1000             # Optional: cap on followers to fetch (default: 1000)
```

### Database Setup

```bash
bun run prisma migrate dev
```

## Usage

### Adding Users

```bash
# Add a user with a Discord webhook
bun run scripts/add-user.ts --user octocat --webhook https://discord.com/api/webhooks/...

# Add a user with a Slack webhook
bun run scripts/add-user.ts -u octocat -w https://hooks.slack.com/services/...

# Add a user without webhook (just track in DB)
bun run scripts/add-user.ts -u octocat
```

### Running Manually

```bash
bun run index.ts
```

## Docker

### One-shot execution (for external schedulers like Render Cron)

```bash
docker build -t follower-tracker .
docker run --env-file .env follower-tracker
```

### Built-in cron scheduling

```bash
docker build --target cron -t follower-tracker-cron .
docker run -d --env-file .env -e CRON_SCHEDULE="0 * * * *" follower-tracker-cron
```

Cron schedule examples:
- `*/5 * * * *` - every 5 minutes
- `0 * * * *` - every hour (default)
- `0 */6 * * *` - every 6 hours

## How It Works

The tracker uses an optimized approach to minimize GitHub API requests:

1. **Fetch profile** (1 request) - gets the follower count
2. **Compare counts** - if stored count matches GitHub count:
   - Fetch the last page of followers (newest followers are at the end)
   - If no new followers detected, skip entirely (2 requests total)
3. **Full sync** - only if count changed OR new followers detected on last page

This handles edge cases like follow/unfollow churn while being efficient when nothing has changed.

## Webhook Formats

### Discord

Sends rich embeds with clickable GitHub profile links, color-coded green for new followers and red for unfollows.

### Slack

Uses Block Kit with mrkdwn formatting and clickable profile links.

### Generic

For other webhook services, sends a JSON payload:

```json
{
  "text": "GitHub Follower Update for username",
  "gained": ["user1", "user2"],
  "lost": ["user3"]
}
```