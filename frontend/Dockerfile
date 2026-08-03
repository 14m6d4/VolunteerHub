FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm ci
COPY . .
RUN npm run build:docker

FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
