ARG NODE_VERSION=20.9.0

FROM node:${NODE_VERSION}-bookworm AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

ENV HUSKY=0

WORKDIR /workspace-install

COPY --link package.json pnpm-lock.yaml ./

RUN pnpm fetch

COPY --link . .

RUN pnpm install --prefer-offline --frozen-lockfile

FROM deps AS builder

ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps --link /workspace-install ./

RUN NODE_OPTIONS=--max-old-space-size=8192 pnpm build

FROM builder as post-builder

ENV NODE_ENV=production

WORKDIR /app

RUN set -ex; \
        rm -fr node_modules; \
        pnpm install --prod --prefer-offline --frozen-lockfile

FROM node:${NODE_VERSION}-bookworm-slim AS runner

ENV TZ=Asia/Shanghai \
    NODE_ENV=production \
    PORT=3000

COPY --from=post-builder /app/dist ./app/runtime

COPY --from=post-builder /app/node_modules ./node_modules
COPY --from=post-builder /app/package.json ./package.json

EXPOSE ${PORT}

ENTRYPOINT ["node", "app/runtime/main.js"]