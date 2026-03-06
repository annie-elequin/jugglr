FROM oven/bun:1-debian

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

# Generate Prisma client (needs schema + deps)
RUN bunx prisma generate

# Copy remaining source
COPY . .

EXPOSE 3000

# Push schema to DB then start server
CMD bunx prisma db push && bun run src/index.ts
