import * as Sentry from "@sentry/react";

/** What `/config.js` sets at runtime: one image serves both environments (statline-infra D-43). */
export interface ConfigRuntime {
  sentryDsn?: string;
  sentryEnvironment?: string;
  /** Cognito pool of this environment (statline-infra D-47); absent: the api's own login. */
  cognitoRegion?: string;
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
}

declare global {
  interface Window {
    __STATLINE_CONFIG__?: ConfigRuntime;
  }
}

/**
 * Sentry error monitoring for the SPA. Off without a DSN (`pnpm dev`, tests, images outside the
 * cluster). The release is the commit the bundle was built from, the same name its source maps
 * were uploaded under, so stack traces point to the real code even after the image is promoted.
 */
export function initSentry(
  config: ConfigRuntime = window.__STATLINE_CONFIG__ ?? {},
  release: string | undefined = import.meta.env.VITE_SENTRY_RELEASE,
): boolean {
  if (!config.sentryDsn) return false;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.sentryEnvironment || "development",
    release: release || undefined,
    // Errors only: no tracing or session replay, to stay inside the plan's quota.
    // No user fields, cookies or request bodies (login and registro carry passwords).
    dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
  });
  return true;
}
