FROM node:26-bookworm-slim AS build
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g corepack && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
RUN pnpm --filter @amigo-doce/api build

FROM node:26-bookworm-slim AS development
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g corepack && corepack enable

FROM node:26-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /workspace/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
USER node
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
