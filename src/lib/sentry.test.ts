import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/react";
import { initSentry } from "./sentry";

vi.mock("@sentry/react", () => ({ init: vi.fn() }));

describe("initSentry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays off without a DSN", () => {
    expect(initSentry({}, "abc1234")).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("starts with the runtime environment and the build release", () => {
    expect(
      initSentry(
        { sentryDsn: "https://key@o1.ingest.sentry.io/2", sentryEnvironment: "prod" },
        "abc1234",
      ),
    ).toBe(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://key@o1.ingest.sentry.io/2",
        environment: "prod",
        release: "abc1234",
        dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
      }),
    );
  });

  it("defaults the environment and drops an empty release", () => {
    initSentry({ sentryDsn: "https://key@o1.ingest.sentry.io/2" }, "");
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "development", release: undefined }),
    );
  });
});
