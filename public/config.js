// Runtime configuration. In Kubernetes the chart mounts its own config.js over this file, with
// the Sentry DSN and environment of that namespace (statline-infra D-43) and, with Cognito, the
// user pool and client ids (statline-infra D-47). This default keeps Sentry off and the api's own
// login for `pnpm dev`, tests and any image run outside the cluster.
window.__STATLINE_CONFIG__ = {};
