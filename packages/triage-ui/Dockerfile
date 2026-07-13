FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++ && corepack enable

# ── deps: install all workspace dependencies ────────────────────────────────
FROM base AS deps
WORKDIR /app

# workspace manifest + lockfile (pnpm needs these to resolve workspace:* links)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json            ./packages/types/
COPY packages/compliance-evals/package.json ./packages/compliance-evals/
COPY packages/ui/package.json               ./packages/ui/
COPY packages/triage-ui/package.json        ./packages/triage-ui/

RUN pnpm install --frozen-lockfile

# ── builder: compile every package in dependency order ──────────────────────
FROM base AS builder
WORKDIR /app

# bring installed node_modules from deps stage, then overlay source
COPY --from=deps /app ./
COPY . .

# turbo respects build order: types → compliance-evals → ui → triage-ui
RUN pnpm turbo build && mkdir -p packages/triage-ui/public

# ── runner: minimal production image ────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/triage-ui/.next/standalone ./
COPY --from=builder /app/packages/triage-ui/.next/static     ./packages/triage-ui/.next/static
COPY --from=builder /app/packages/triage-ui/public           ./packages/triage-ui/public

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/triage-ui/server.js"]
