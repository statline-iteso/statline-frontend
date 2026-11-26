import type { ConfigRuntime } from "../lib/sentry";

/** The Cognito pool from /config.js (statline-infra D-47); null keeps the api's own login. */
export function configCognito(
  config: ConfigRuntime = window.__STATLINE_CONFIG__ ?? {},
): { userPoolId: string; clientId: string } | null {
  if (!config.cognitoUserPoolId || !config.cognitoClientId) return null;
  return { userPoolId: config.cognitoUserPoolId, clientId: config.cognitoClientId };
}
