/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
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
});
