FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Only compiled JS and runtime deps: no tsc/tsx, no sources, not root.
FROM base AS prod
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# SQL migrations, applied by the `migrate` compose service (node dist/db/migrate.js).
COPY --from=build /app/drizzle ./drizzle
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --start-interval=2s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "--enable-source-maps", "dist/server.js"]
