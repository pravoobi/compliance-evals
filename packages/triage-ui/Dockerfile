FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY packages/triage-ui/package.json ./packages/triage-ui/
COPY packages/types/package.json ./packages/types/
COPY packages/compliance-evals/package.json ./packages/compliance-evals/
COPY packages/ui/package.json ./packages/ui/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/triage-ui/.next/standalone ./
COPY --from=builder /app/packages/triage-ui/.next/static ./packages/triage-ui/.next/static
COPY --from=builder /app/packages/triage-ui/public ./packages/triage-ui/public 2>/dev/null || true

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "packages/triage-ui/server.js"]
