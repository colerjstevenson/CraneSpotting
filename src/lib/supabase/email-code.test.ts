import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { verifyEmailCode } from "./email-code";

const session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "test-player", aud: "authenticated", email: "player@example.test" },
};

function codeForm(email = "player@example.test", token = "012345", next = "/submit") {
  const form = new FormData();
  form.set("email", email);
  form.set("token", token);
  form.set("next", next);
  return form;
}

function authClient(setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => void = () => {}) {
  return async () => createServerClient("https://auth.example.test", "test-publishable-key", {
    cookies: { getAll: () => [], setAll },
  });
}

test("verifies an email code without PKCE and writes the session into the current app", async (t) => {
  let body: unknown;
  let url = "";
  const cookies: { name: string; value: string }[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    url = String(input);
    body = JSON.parse(String(init.body));
    return Response.json(session);
  });

  const result = await verifyEmailCode(
    codeForm(" PLAYER@EXAMPLE.TEST ", " 012345 ", "/submit?source=app"),
    authClient((values) => cookies.push(...values)),
  );

  assert.deepEqual(result, { status: "success", next: "/submit?source=app" });
  assert.equal(url, "https://auth.example.test/auth/v1/verify");
  assert.deepEqual(body, { email: "player@example.test", token: "012345", type: "email", gotrue_meta_security: {} });
  assert.ok(cookies.some(({ name, value }) => name.includes("auth-token") && value.length > 0));
});

test("accepts the configured OTP length while preserving leading zeroes", async (t) => {
  const tokens: string[] = [];
  t.mock.method(globalThis, "fetch", async (_input: string, init: RequestInit) => {
    tokens.push(JSON.parse(String(init.body)).token);
    return Response.json(session);
  });
  for (const token of ["012345", "01234567", "0123456789"]) {
    assert.equal((await verifyEmailCode(codeForm("player@example.test", token), authClient())).status, "success");
  }
  assert.deepEqual(tokens, ["012345", "01234567", "0123456789"]);
});

test("rejects malformed email and codes before creating an auth client", async () => {
  let created = false;
  const createClient = async () => {
    created = true;
    throw new Error("Invalid input must not create a client");
  };
  for (const form of [
    codeForm("invalid"),
    codeForm("player@example.test", ""),
    codeForm("player@example.test", "12345"),
    codeForm("player@example.test", "12345678901"),
    codeForm("player@example.test", "abcdef"),
  ]) {
    assert.equal((await verifyEmailCode(form, createClient)).status, "error");
  }
  assert.equal(created, false);
});

test("expired, reused, and wrong codes show an error without returning a redirect", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(
    { code: "otp_expired", msg: "Invalid token" },
    { status: 403, headers: { "x-supabase-api-version": "2024-01-01" } },
  ));
  const log = t.mock.method(console, "error", () => {});
  const result = await verifyEmailCode(codeForm("private@example.test", "012345"), authClient());
  assert.equal(result.status, "error");
  if (result.status === "error") assert.match(result.message, /invalid or expired/);
  const logged = JSON.stringify(log.mock.calls);
  assert.ok(logged.includes("otp_expired"));
  assert.ok(!logged.includes("012345"));
  assert.ok(!logged.includes("private@example.test"));
});

test("rate-limited code verification shows a retry message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(
    { code: "over_request_rate_limit", msg: "Too many requests" },
    { status: 429, headers: { "x-supabase-api-version": "2024-01-01" } },
  ));
  t.mock.method(console, "error", () => {});
  assert.deepEqual(await verifyEmailCode(codeForm(), authClient()), {
    status: "error",
    message: "Too many attempts. Wait a few minutes, then try again.",
  });
});

test("a verification response without a session cannot report success", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ user: session.user }));
  t.mock.method(console, "error", () => {});
  assert.equal((await verifyEmailCode(codeForm(), authClient())).status, "error");
});

test("client setup and cookie write failures are surfaced instead of successful sign-in", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => Response.json(session));
  const setupFailure = await verifyEmailCode(codeForm(), async () => {
    throw new Error("Setup unavailable");
  });
  assert.equal(setupFailure.status, "error");
  const cookieFailure = await verifyEmailCode(codeForm(), authClient(() => {
    throw new Error("Cookie writes unavailable");
  }));
  assert.equal(cookieFailure.status, "error");
});

test("code verification permits only local return paths", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(session));
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
    assert.deepEqual(await verifyEmailCode(codeForm("player@example.test", "012345", next), authClient()), {
      status: "success", next: "/",
    });
  }
});
