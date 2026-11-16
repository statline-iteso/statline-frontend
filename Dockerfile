# syntax=docker/dockerfile:1
# statline/web: build with Vite, serve the static bundle with unprivileged nginx.
#   docker build -t statline/web:local .

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
# /api is routed to the api Service by the Ingress, not by this nginx.
