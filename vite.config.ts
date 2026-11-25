/// <reference types="vitest/config" />
import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Source maps go to Sentry only when CD passes SENTRY_AUTH_TOKEN (a Docker build secret): they
// are built "hidden" (no sourceMappingURL), uploaded under the release, then deleted, so nginx
// never serves them. Without the token (dev, CI, local images) no maps are built at all.
// loadEnv reads the build environment (Dockerfile ENV and the secret) for these prefixes.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", ["SENTRY_", "VITE_SENTRY_"]);
  const subirMapas = Boolean(env.SENTRY_AUTH_TOKEN);
  return {
    plugins: [
      react(),
      ...(subirMapas
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              release: { name: env.VITE_SENTRY_RELEASE },
              sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
              telemetry: false,
            }),
          ]
        : []),
    ],
    build: { sourcemap: subirMapas ? "hidden" : false },
    server: {
      port: 5173,
      // Local: the API runs on :3000 (statline-backend). In AKS the ingress routes /api to it.
      proxy: { "/api": "http://localhost:3000" },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/main.tsx", "src/test/**", "src/**/*.d.ts", "src/**/*.test.{ts,tsx}"],
        thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
      },
    },
  };
});
