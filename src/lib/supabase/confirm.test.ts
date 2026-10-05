import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { confirmAuthLink } from "./confirm";

const config = { url: "https://auth.example.test", publishableKey: "test-publishable-key" };
const session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "test-user", aud: "authenticated", email: "player@example.test" },
};

test("email token verification signs in a browser with no PKCE cookie", async (t) => {
  const calls: { url: string; body: unknown }[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init.body)) });
    return Response.json(session);
  });
  const response = await confirmAuthLink(
    new NextRequest("https://game.example.test/auth/confirm?next=%2Fsubmit&token_hash=fresh-token&type=email"),
    config,
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://game.example.test/submit");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://auth.example.test/auth/v1/verify");
  assert.deepEqual(calls[0].body, { token_hash: "fresh-token", type: "email", gotrue_meta_security: {} });
  assert.ok(response.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth-token")));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("legacy PKCE links still exchange the code using the requesting browser's cookie", async (t) => {
  let body: unknown;
  t.mock.method(globalThis, "fetch", async (_input: string, init: RequestInit) => {
    body = JSON.parse(String(init.body));
    return Response.json(session);
  });
  const response = await confirmAuthLink(
    new NextRequest("https://game.example.test/auth/confirm?code=legacy-code&next=%2Fsubmit", {
      headers: {
        cookie: `sb-auth-auth-token-code-verifier=base64-${Buffer.from(JSON.stringify("test-verifier")).toString("base64url")}`,
      },
    }),
    config,
  );
  assert.equal(response.headers.get("location"), "https://game.example.test/submit");
  assert.deepEqual(body, { auth_code: "legacy-code", code_verifier: "test-verifier" });
  assert.ok(response.cookies.getAll().some(({ name, value }) => name.endsWith("code-verifier") && value === ""));
});

test("expired and already-used tokens are rejected without logging their secrets", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(
    { code: "otp_expired", msg: "Token has expired or is invalid" },
    { status: 403, headers: { "x-supabase-api-version": "2024-01-01" } },
  ));
  const log = t.mock.method(console, "error", () => {});
  const response = await confirmAuthLink(
    new NextRequest("https://game.example.test/auth/confirm?next=%2Fsubmit&token_hash=secret-token&type=email"),
    config,
  );
  assert.equal(response.headers.get("location"), "https://game.example.test/login?error=link&next=%2Fsubmit");
  assert.equal(response.cookies.getAll().length, 0);
  assert.ok(!JSON.stringify(log.mock.calls).includes("secret-token"));
  assert.ok(JSON.stringify(log.mock.calls).includes("otp_expired"));
});

test("a legacy PKCE link opened without its verifier cookie reports the actual cause", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected network call");
  });
  const log = t.mock.method(console, "error", () => {});
  const response = await confirmAuthLink(
    new NextRequest("https://game.example.test/auth/confirm?code=legacy-code&next=%2Fsubmit"),
    config,
  );
  assert.equal(response.headers.get("location"), "https://game.example.test/login?error=link&next=%2Fsubmit");
  assert.equal(fetch.mock.callCount(), 0);
  assert.ok(JSON.stringify(log.mock.calls).includes("pkce_code_verifier_not_found"));
});

test("missing or unsupported callback parameters never call Supabase", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected network call");
  });
  t.mock.method(console, "error", () => {});
  for (const query of ["", "?token_hash=token", "?token_hash=token&type=unsupported", "?type=email"]) {
    const response = await confirmAuthLink(new NextRequest(`https://game.example.test/auth/confirm${query}`), config);
    assert.equal(response.headers.get("location"), "https://game.example.test/login?error=link&next=%2F");
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("successful verification cannot redirect to an external origin", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(session));
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
    const request = new NextRequest(`https://game.example.test/auth/confirm?token_hash=token&type=email&next=${encodeURIComponent(next)}`);
    const response = await confirmAuthLink(request, config);
    assert.equal(response.headers.get("location"), "https://game.example.test/");
  }
});

test("both email templates target token verification and preserve the return path", () => {
  for (const name of ["magic-link", "confirm-signup"]) {
    const template = readFileSync(new URL(`../../../supabase/templates/${name}.html`, import.meta.url), "utf8");
    assert.ok(!template.includes("{{ .ConfirmationURL }}"));
    const links = [...template.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(links.length, 2);
    for (const link of links) {
      const rendered = link
        .replace("{{ .RedirectTo }}", "https://game.example.test/auth/confirm?next=%2Fsubmit")
        .replace("{{ .TokenHash }}", "fresh-token")
        .replaceAll("&amp;", "&");
      const url = new URL(rendered);
      assert.equal(url.pathname, "/auth/confirm");
      assert.equal(url.searchParams.get("next"), "/submit");
      assert.equal(url.searchParams.get("token_hash"), "fresh-token");
      assert.equal(url.searchParams.get("type"), "email");
    }
  }
});
