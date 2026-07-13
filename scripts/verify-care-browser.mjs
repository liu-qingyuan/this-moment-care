#!/usr/bin/env node

import { chromium, devices } from "playwright";

const publicUrl = new URL(
  process.argv[2] ?? process.env.PUBLIC_URL ?? "https://care.q1ngyuan.top",
);
const origin = publicUrl.origin;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function recordRequests(page) {
  const requests = [];
  page.on("request", (request) => {
    requests.push({
      method: request.method(),
      postData: request.postData(),
      url: request.url(),
    });
  });
  return requests;
}

function assertSessionContentStayedLocal(requests, sessionContent) {
  const unsafeRequest = requests.find(
    (request) =>
      !["GET", "HEAD"].includes(request.method) || request.postData !== null,
  );
  assert(
    unsafeRequest === undefined,
    `Unexpected content-capable request: ${unsafeRequest?.method} ${unsafeRequest?.url}`,
  );

  const leakedContent = sessionContent.find((content) =>
    requests.some((request) =>
      `${request.url}\n${request.postData ?? ""}`.includes(content),
    ),
  );
  assert(leakedContent === undefined, "Session content appeared in a network request.");
}

async function verifyDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const page = await context.newPage();
  const requests = recordRequests(page);
  const original = "部署验收：我担心明天的安排，也希望家人在身边。";
  const crisisSignal = "我想伤害自己";

  const currentImageResponse = page.waitForResponse(
    (response) => response.url().endsWith("/assets/current-moment-desk.png"),
  );
  await page.goto(publicUrl.href, { waitUntil: "networkidle" });
  assert((await currentImageResponse).ok(), "Desktop photography request failed.");
  assert((await page.title()) === "This Moment · 此刻", "Desktop title is not This Moment.");
  const currentImage = await page
    .locator(".activity-layout")
    .evaluate((element) => getComputedStyle(element, "::before").backgroundImage);
  assert(currentImage.includes("/assets/current-moment-desk.png"), "Desktop photography is missing.");

  await page.locator("#current-input").fill(original);
  await page.locator("[data-submit-current]").click();
  await page.locator(".reflection-preview").waitFor();
  const preview = await page.locator(".reflection-preview").innerText();
  assert(preview.includes(original) && preview.includes("我正在感受"), "Desktop preview is incomplete.");

  await page.locator("[data-copy-current]").click();
  await page.getByText("已复制", { exact: true }).waitFor();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert(copied.includes("我正在感受"), "Desktop copy confirmation failed.");

  await page.locator("[data-revise-current]").click();
  await page.locator("#current-input").fill(crisisSignal);
  const crisisImageResponse = page.waitForResponse(
    (response) => response.url().endsWith("/assets/crisis-open-door.png"),
  );
  await page.locator("[data-submit-current]").click();
  await page.getByRole("heading", { name: "先停一下" }).waitFor();
  assert((await crisisImageResponse).ok(), "Desktop crisis photography request failed.");
  const crisisImage = await page
    .locator(".crisis-layout")
    .evaluate((element) => getComputedStyle(element, "::before").backgroundImage);
  assert(crisisImage.includes("/assets/crisis-open-door.png"), "Desktop crisis photography is missing.");

  await page.locator("[data-crisis-return]").click();
  assert(
    (await page.locator("#current-input").inputValue()) === crisisSignal,
    "Desktop crisis return lost original information.",
  );
  assertSessionContentStayedLocal(requests, [original, crisisSignal]);
  await context.close();
}

async function verifyMobile(browser) {
  const context = await browser.newContext({ ...devices["iPhone 15"] });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const page = await context.newPage();
  const requests = recordRequests(page);
  const expression = "部署验收：谢谢你一直陪着我，我很珍惜我们一起度过的时间。";
  const finalDraft = "姐姐，谢谢你一直陪着我。";
  const crisisSignal = "我想伤害自己";

  await page.goto(publicUrl.href, { waitUntil: "networkidle" });
  const navState = await page.locator(".primary-nav").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      bottomGap: Math.round(window.innerHeight - box.bottom),
      position: getComputedStyle(element).position,
      viewportWidth: window.innerWidth,
      width: Math.round(box.width),
    };
  });
  assert(
    navState.position === "fixed" &&
      Math.abs(navState.bottomGap) <= 1 &&
      navState.width === navState.viewportWidth,
    "Mobile navigation is not fixed to the viewport.",
  );

  const expressionImageResponse = page.waitForResponse(
    (response) => response.url().endsWith("/assets/expression-letter.png"),
  );
  await page.locator("[data-activity=express]").click();
  assert((await expressionImageResponse).ok(), "Mobile photography request failed.");
  const expressionImage = await page
    .locator(".activity-layout")
    .evaluate((element) => getComputedStyle(element, "::before").backgroundImage);
  assert(expressionImage.includes("/assets/expression-letter.png"), "Mobile photography is missing.");
  await page.locator("#expression-audience").fill("姐姐");
  await page.locator("#expression-input").fill(expression);
  await page.locator("[data-submit-expression]").click();
  await page.locator(".expression-preview").waitFor();
  const preview = await page.locator(".expression-preview").innerText();
  assert(preview.includes("整理后的话") && preview.includes("姐姐"), "Mobile preview is incomplete.");

  await page.locator("#expression-draft").fill(finalDraft);
  await page.locator("[data-copy-expression]").click();
  await page.getByText("已复制", { exact: true }).waitFor();
  assert(
    (await page.evaluate(() => navigator.clipboard.readText())) === finalDraft,
    "Mobile copy confirmation failed.",
  );

  await page.locator("[data-revise-expression]").click();
  await page.locator("#expression-input").fill(crisisSignal);
  await page.locator("[data-submit-expression]").click();
  await page.getByRole("heading", { name: "先停一下" }).waitFor();
  assert((await page.locator(".primary-nav").count()) === 0, "Mobile nav did not yield to crisis interruption.");
  assertSessionContentStayedLocal(requests, [expression, finalDraft, crisisSignal]);
  await context.close();
}

if (publicUrl.protocol !== "https:") {
  console.error(`[verify-care-browser] Public URL must use HTTPS: ${publicUrl}`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
try {
  await verifyDesktop(browser);
  console.log("[verify-care-browser] Desktop workflow verified");
  await verifyMobile(browser);
  console.log("[verify-care-browser] Mobile workflow verified");
} catch (error) {
  console.error(`[verify-care-browser] ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
