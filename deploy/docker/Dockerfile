# syntax=docker/dockerfile:1
ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM node:24.13.1-bookworm-slim@sha256:a81a03dd965b4052269a57fac857004022b522a4bf06e7a739e25e18bce45af2 AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build:workspaces

FROM node:24.13.1-bookworm-slim@sha256:a81a03dd965b4052269a57fac857004022b522a4bf06e7a739e25e18bce45af2 AS runtime
ENV NODE_ENV=production
WORKDIR /app
USER node

FROM build AS chat-package
RUN pnpm --filter chat deploy --legacy --prod /out/chat

FROM runtime AS chat
COPY --from=chat-package --chown=node:node /out/chat /app
EXPOSE 2804
CMD ["node", "dist/src/main.js"]

FROM build AS account-package
RUN pnpm --filter account deploy --legacy --prod /out/account

FROM runtime AS account
COPY --from=account-package --chown=node:node /out/account /app
EXPOSE 2800
CMD ["node", "dist/src/main.js"]

FROM build AS match-package
RUN pnpm --filter match deploy --legacy --prod /out/match

FROM runtime AS match
COPY --from=match-package --chown=node:node /out/match /app
EXPOSE 2801
CMD ["node", "dist/src/main.js"]

FROM build AS gateway-package
RUN pnpm --filter gateway deploy --legacy --prod /out/gateway

FROM runtime AS gateway
COPY --from=gateway-package --chown=node:node /out/gateway /app
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

FROM runtime AS admin-ui
ENV UI_APP=admin
COPY --from=build --chown=node:node /workspace/packages/admin-ui/dist /app/dist
COPY --chown=node:node deploy/docker/ui-server.mjs /app/server.mjs
EXPOSE 8080
CMD ["node", "server.mjs"]
