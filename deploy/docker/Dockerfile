# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:24.13.1-bookworm-slim@sha256:a81a03dd965b4052269a57fac857004022b522a4bf06e7a739e25e18bce45af2 AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build:workspaces
RUN pnpm --filter account deploy --legacy --prod /out/account \
 && pnpm --filter match deploy --legacy --prod /out/match \
 && pnpm --filter gateway deploy --legacy --prod /out/gateway

FROM node:24.13.1-bookworm-slim@sha256:a81a03dd965b4052269a57fac857004022b522a4bf06e7a739e25e18bce45af2 AS runtime
ENV NODE_ENV=production
WORKDIR /app
USER node

FROM runtime AS account
COPY --from=build --chown=node:node /out/account /app
EXPOSE 2800
CMD ["node", "dist/src/main.js"]

FROM runtime AS match
COPY --from=build --chown=node:node /out/match /app
EXPOSE 2801
CMD ["node", "dist/src/main.js"]

FROM runtime AS gateway
COPY --from=build --chown=node:node /out/gateway /app
EXPOSE 4000
CMD ["node", "dist/src/main.js"]

FROM gateway AS edge-authz
ENV EDGE_AUTHZ_HOST=0.0.0.0
EXPOSE 4010
CMD ["node", "dist/src/edge-authz/main.js"]

FROM runtime AS integration-ui
COPY --from=build --chown=node:node /workspace/packages/integration-ui/dist /app/dist
COPY --chown=node:node deploy/docker/ui-server.mjs /app/server.mjs
EXPOSE 8080
CMD ["node", "server.mjs"]
