// Runtime configuration. In Kubernetes the chart mounts its own config.js over this file, with
// the Sentry DSN and environment of that namespace (statline-infra D-43). This default keeps
// Sentry off for `pnpm dev`, tests and any image run outside the cluster.
window.__STATLINE_CONFIG__ = {};
