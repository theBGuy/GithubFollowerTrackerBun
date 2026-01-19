FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/prisma ./prisma
COPY . .
RUN bun run prisma generate

# Default: run once (for Render cron jobs, CI, etc.)
CMD ["bun", "run", "index.ts"]

# Cron variant: use `docker build --target cron` to build this
FROM release AS cron
RUN chmod +x /app/entrypoint.sh
# CRON_SCHEDULE env var controls the schedule (default: hourly)
CMD ["/app/entrypoint.sh"]
