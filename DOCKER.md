# GitHub Follower Tracker - Docker Deployment

Quick start guide for running with Docker.

## Prerequisites

- Docker and Docker Compose installed
- GitHub Personal Access Token
- Notification webhooks (Slack/Discord) or email credentials

## Quick Start

1. **Copy and configure environment file:**

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Add your `GITHUB_TOKEN` and `GITHUB_USERNAME`
- Enable at least one notification channel
- Add webhook URLs or email credentials

2. **Start the services:**

```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL database
- Build and run the tracker application
- Automatically run database migrations
- Begin monitoring your GitHub followers

3. **View logs:**

```bash
docker-compose logs -f app
```

4. **Stop the services:**

```bash
docker-compose down
```

## Database Access

The PostgreSQL database is exposed on port 5432. Connect using:
- Host: `localhost`
- Port: `5432`
- Database: `github_tracker`
- Username: `postgres`
- Password: `postgres`

## Persistent Data

Follower data is stored in a Docker volume named `postgres_data`. This persists across container restarts.

To completely reset:
```bash
docker-compose down -v  # WARNING: Deletes all data
```

## Local Development

For local development without Docker:

1. **Start PostgreSQL:**

```bash
docker-compose up -d postgres
```

2. **Set DATABASE_URL in .env:**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/github_tracker
```

3. **Run migrations:**

```bash
bunx prisma migrate deploy
# or for development
bunx prisma migrate dev
```

4. **Run the app:**

```bash
bun run index.ts
```

## Updating

To update the app:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```
