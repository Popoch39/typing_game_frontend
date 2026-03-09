import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock better-auth/cookies before importing proxy
vi.mock("better-auth/cookies", () => ({
  getSessionCookie: vi.fn(),
}));

import { getSessionCookie } from "better-auth/cookies";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

const mockedGetSessionCookie = vi.mocked(getSessionCookie);

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unauthenticated user", () => {
    beforeEach(() => {
      mockedGetSessionCookie.mockReturnValue(null);
    });

    it("redirects / to /auth when no session", () => {
      const request = createRequest("/");
      const response = proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location") ?? "";
      expect(new URL(location).pathname).toBe("/auth");
    });

    it("allows access to /auth when no session", () => {
      const request = createRequest("/auth");
      const response = proxy(request);

      // NextResponse.next() returns 200
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("authenticated user", () => {
    beforeEach(() => {
      mockedGetSessionCookie.mockReturnValue(
        "fake-session-token" as unknown as ReturnType<typeof getSessionCookie>,
      );
    });

    it("allows access to / when session exists", () => {
      const request = createRequest("/");
      const response = proxy(request);

      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects /auth to / when session exists", () => {
      const request = createRequest("/auth");
      const response = proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location") ?? "";
      expect(new URL(location).pathname).toBe("/");
    });
  });

  describe("getSessionCookie interaction", () => {
    it("passes the request to getSessionCookie", () => {
      mockedGetSessionCookie.mockReturnValue(null);
      const request = createRequest("/");
      proxy(request);

      expect(mockedGetSessionCookie).toHaveBeenCalledWith(request);
    });

    it("is called exactly once per request", () => {
      mockedGetSessionCookie.mockReturnValue(null);
      const request = createRequest("/");
      proxy(request);

      expect(mockedGetSessionCookie).toHaveBeenCalledTimes(1);
    });
  });
});

describe("proxy config", () => {
  it("matches / and /auth routes", () => {
    expect(config.matcher).toContain("/");
    expect(config.matcher).toContain("/auth");
  });

  it("only matches 2 routes", () => {
    expect(config.matcher).toHaveLength(2);
  });
});
