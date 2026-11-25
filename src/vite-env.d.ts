/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Commit the bundle was built from (Dockerfile build arg); Sentry release name. */
  readonly VITE_SENTRY_RELEASE?: string;
}
