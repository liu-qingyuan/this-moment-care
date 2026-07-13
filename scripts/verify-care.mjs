#!/usr/bin/env node

const publicUrl = new URL(
  process.argv[2] ?? process.env.PUBLIC_URL ?? "https://care.q1ngyuan.top",
);

function fail(message) {
  console.error(`[verify-care] ${message}`);
  process.exit(1);
}

function isLoopback(hostname) {
  return hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost";
}

if (publicUrl.protocol !== "https:" && !isLoopback(publicUrl.hostname)) {
  fail(`Public URL must use HTTPS: ${publicUrl}`);
}

let pageResponse;
try {
  pageResponse = await fetch(publicUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
} catch (error) {
  fail(`Public request failed: ${error.message}`);
}

if (!pageResponse.ok) {
  fail(`Public page returned HTTP ${pageResponse.status}.`);
}
if (new URL(pageResponse.url).protocol !== publicUrl.protocol) {
  fail(`Public page changed protocol: ${pageResponse.url}`);
}

const html = await pageResponse.text();
const isThisMoment =
  html.includes("<title>This Moment · 此刻</title>") &&
  /<main\s+id=["']app["']><\/main>/.test(html);
const isKnownWrongPage =
  /Welcome to nginx!/i.test(html) || /<title>女书 TTS 文化体验<\/title>/.test(html);

if (!isThisMoment || isKnownWrongPage) {
  fail("Public page is not This Moment.");
}

const assetMatch = html.match(/(?:src|href)=["'](\/assets\/[^"']+)["']/);
if (!assetMatch) {
  fail("Public page does not reference a representative local asset.");
}

const assetUrl = new URL(assetMatch[1], publicUrl);
if (assetUrl.origin !== publicUrl.origin) {
  fail(`Representative asset is not local: ${assetUrl}`);
}

let assetResponse;
try {
  assetResponse = await fetch(assetUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
} catch (error) {
  fail(`Representative asset request failed: ${error.message}`);
}

if (!assetResponse.ok) {
  fail(`Representative asset returned HTTP ${assetResponse.status}: ${assetUrl.pathname}`);
}

console.log(`[verify-care] Verified ${publicUrl} and ${assetUrl.pathname}`);
