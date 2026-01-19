FROM oven/bun:1 AS base
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

CMD ["bun", "run", "index.ts"]
