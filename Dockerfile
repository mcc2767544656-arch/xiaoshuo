# syntax=docker/dockerfile:1
FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.0.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN pnpm build

FROM node:24.22.1-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=10000 QIDU_DATA_DIR=/var/data/qidu/library
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY deploy/entrypoint.sh /usr/local/bin/qidu-entrypoint
RUN chmod 755 /usr/local/bin/qidu-entrypoint && mkdir -p /var/data/qidu && chown node:node /var/data/qidu
EXPOSE 10000
# The entrypoint only fixes the mounted disk owner, then drops to node (uid 1000).
ENTRYPOINT ["qidu-entrypoint"]
CMD ["node", "server/index.mjs"]
