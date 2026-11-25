# syntax=docker/dockerfile:1
# statline/web: build with Vite, serve the static bundle with unprivileged nginx.
#   docker build -t statline/web:local .

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Sentry (statline-infra D-43): the release is the commit (cd.yml build arg; empty in CI). The
# auth token is a build secret, never a layer: with it, the build uploads hidden source maps.
ARG SENTRY_RELEASE=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ENV VITE_SENTRY_RELEASE=${SENTRY_RELEASE} SENTRY_ORG=${SENTRY_ORG} SENTRY_PROJECT=${SENTRY_PROJECT}
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN pnpm build

FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime
# Patched OS packages; the base image runs as user 101, so switch to root only for the upgrade.
USER root
RUN apk upgrade --no-cache
USER 101
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
# /api is routed to the api Service by the Ingress, not by this nginx.
