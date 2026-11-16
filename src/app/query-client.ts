import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/client";

/** Retries only what can succeed on retry: network errors and 5xx, at most twice. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
}

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Data changes only when the CronJobs run, so a minute of staleness is fine.
        staleTime: 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
