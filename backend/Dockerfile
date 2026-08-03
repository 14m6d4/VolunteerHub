FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

FROM base AS prod
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npx", "tsx", "server.ts"]
