// Headless end-to-end check of the deployed judge flow + screenshots.
// Run from apps/retr0school (uses its Playwright): node scripts/near-e2e.mjs
import { chromium } from "@playwright/test";

const R0 = process.env.R0_URL || "https://retr0school-near.vercel.app";
const CE = process.env.CE_URL || "https://code-e-near.vercel.app";
const OUT = new URL("../../../artifacts/", import.meta.url).pathname;
// The NEAR quiz key is secret (grader env var). Pass it in to test the "passed" path:
//   NEAR_QUIZ_ANSWER_KEY=2,0,... node scripts/near-e2e.mjs
const KEY = (process.env.NEAR_QUIZ_ANSWER_KEY || "").split(",").filter(Boolean).map(Number);
// An account that already holds a diploma, used to show the holder views.
const HOLDER = process.env.HOLDER_ACCOUNT || "hackathon-judge.retr0school.testnet";
const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} ${detail}`);
};

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, colorScheme: "dark" });
const page = await ctx.newPage();

try {
  // 1. Home
  await page.goto(R0, { waitUntil: "networkidle" });
  ok("home hero", await page.getByText("Learn NEAR from scratch and graduate on-chain with Retr0 Academy.").isVisible());
  ok("connect button", await page.getByTestId("near-connect").isVisible());
  await page.screenshot({ path: OUT + "01-home.png" });

  // 2. Lesson links to the Playground with the example prefilled
  await page.goto(R0 + "/near/view-vs-change-calls", { waitUntil: "networkidle" });
  const playgroundLink = page.getByTestId("open-in-playground").first();
  const playgroundHref = await playgroundLink.getAttribute("href");
  ok("open in playground link", Boolean(playgroundHref && playgroundHref.includes("/playground")), playgroundHref?.slice(0, 80));
  await page.screenshot({ path: OUT + "02-lesson-view-call.png", fullPage: false });
  await playgroundLink.scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + "03-lesson-open-in-code-e.png" });

  await page.goto(new URL(playgroundHref, R0).href, { waitUntil: "networkidle" });
  const link = page.getByTestId("open-in-code-e").first();
  const href = await link.getAttribute("href");
  ok("open in code e from playground", Boolean(href && href.startsWith(CE + "/#code=")), href?.slice(0, 60));

  // 3. Follow the link into Code E and run the verify example
  const ce = await ctx.newPage();
  await ce.goto(href, { waitUntil: "networkidle" });
  const frame = ce.frameLocator("#preview");
  await frame.locator("#go").click();
  await frame.locator("#out").filter({ hasText: "demo-learner" }).waitFor({ timeout: 20000 });
  ok("code e runs lesson example (verify_diploma)", (await frame.locator("#out").innerText()).includes('"valid": true'));
  await ce.screenshot({ path: OUT + "04-code-e-lesson-example.png" });

  await ce.close();

  // 4. Code E NEAR starter (fresh tab, like a judge clicking the link)
  const ce2 = await ctx.newPage();
  await ce2.goto(CE + "/#template=near", { waitUntil: "networkidle" });
  const sf = ce2.frameLocator("#preview");
  await sf.locator("#connect").click();
  await sf.locator("#account-out").filter({ hasText: "Balance:" }).waitFor({ timeout: 20000 });
  await sf.locator("#verify").click();
  await sf.locator("#diploma-out").filter({ hasText: "Valid diploma" }).waitFor({ timeout: 20000 });
  ok("code e near starter connect + view call", true, await sf.locator("#diploma-out").innerText());
  await ce2.screenshot({ path: OUT + "05-code-e-near-starter.png" });
  await ce2.close();

  // 5. Public verify page
  await page.goto(R0 + "/verify?account=demo-learner.retr0school.testnet", { waitUntil: "networkidle" });
  await page.getByTestId("diploma-card").waitFor({ timeout: 20000 });
  ok("verify page shows diploma", (await page.getByTestId("diploma-score").innerText()).trim() === "7/8");
  await page.screenshot({ path: OUT + "06-verify-page.png" });
  await page.getByTestId("verify-input").fill("nobody-here-123.testnet");
  await page.getByTestId("verify-submit").click();
  await page.getByTestId("verify-none").waitFor({ timeout: 20000 });
  ok("verify page negative case", true);

  // 6. Quiz: wrong answers fail (server-graded), right answers unlock the diploma
  await page.goto(R0 + "/near/quiz", { waitUntil: "networkidle" });
  for (let i = 0; i < 8; i++) await page.getByTestId(`quiz-${i}-0`).click();
  await page.getByTestId("quiz-submit").click();
  await page.getByTestId("quiz-score").waitFor({ timeout: 20000 });
  ok("server-graded quiz returns a score", true, await page.getByTestId("quiz-score").innerText());
  if (KEY.length === 8) {
    await page.goto(R0 + "/near/quiz", { waitUntil: "networkidle" });
    for (let i = 0; i < KEY.length; i++) await page.getByTestId(`quiz-${i}-${KEY[i]}`).click();
    await page.getByTestId("quiz-submit").click();
    await page.getByTestId("near-diploma-cta").waitFor({ timeout: 20000 });
    ok("quiz pass unlocks diploma", true);
    await page.getByTestId("near-diploma-cta").scrollIntoViewIfNeeded();
    await page.screenshot({ path: OUT + "07-quiz-passed.png" });
  }

  // 7. Diploma page + wallet selector modal
  await page.goto(R0 + "/diploma", { waitUntil: "networkidle" });
  await page.getByText("Your score:").waitFor();
  await page.screenshot({ path: OUT + "08-diploma-page.png" });
  await page.getByTestId("diploma-connect").click();
  await page.locator(".nws-modal-wrapper.open").waitFor({ timeout: 15000 });
  await page.waitForTimeout(800); // modal fade-in
  const meteor = await page.getByText("Meteor Wallet").first().isVisible().catch(() => false);
  ok("wallet selector modal lists MyNearWallet + Meteor", meteor);
  await page.screenshot({ path: OUT + "09-wallet-selector-modal.png" });

  // 8. Leaderboard
  await page.goto(R0 + "/leaderboard", { waitUntil: "networkidle" });
  const rows = await page.getByTestId("leaderboard-row").count();
  ok("leaderboard lists holders", rows >= 1, `${rows} rows`);
  await page.screenshot({ path: OUT + "10-leaderboard.png" });

  // 9. Diploma art + share page with X card
  const art = await ctx.request.get(`${R0}/api/diploma/near/${HOLDER}`);
  ok("diploma art is a PNG", art.ok() && art.headers()["content-type"] === "image/png");
  await page.goto(`${R0}/api/diploma/near/${HOLDER}`);
  await page.screenshot({ path: OUT + "11-diploma-art.png" });
  await page.goto(`${R0}/d/${HOLDER}`, { waitUntil: "networkidle" });
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  const card = await page.locator('meta[name="twitter:card"]').getAttribute("content");
  ok("share page has diploma OG image + large card", Boolean(og?.includes("/api/diploma/near/")) && card === "summary_large_image", og ?? "");
  const share = await page.getByTestId("share-diploma").first().getAttribute("href");
  ok("share button is an X intent with tags", Boolean(share?.startsWith("https://x.com/intent/tweet") && decodeURIComponent(share).includes("#NEARHackathon") && decodeURIComponent(share).includes("@NEARProtocol")));
  await page.screenshot({ path: OUT + "12-share-page.png" });

  // 10. Advanced NEAR: locked for visitors
  await page.goto(R0 + "/advanced/cross-contract-calls", { waitUntil: "networkidle" });
  await page.getByTestId("holder-locked").waitFor();
  ok("advanced lesson locked without a diploma", true);
  await page.screenshot({ path: OUT + "13-advanced-locked.png" });

  // 11. Advanced NEAR: unlocked for a holder. Simulated read-only wallet session (no keys) for the screenshot:
  //     MyNearWallet keeps the signed-in account in localStorage; the unlock itself is the on-chain verify_diploma check.
  const holderCtx = await browser.newContext({ viewport: { width: 1366, height: 860 }, colorScheme: "dark" });
  await holderCtx.addInitScript((acc) => {
    localStorage.setItem("signedAccountId", acc);
    localStorage.setItem("near-wallet-selector:selectedWalletId", JSON.stringify("my-near-wallet"));
  }, HOLDER);
  const hp = await holderCtx.newPage();
  await hp.goto(R0 + "/advanced/cross-contract-calls", { waitUntil: "networkidle" });
  const unlocked = await hp.getByTestId("holder-unlocked").waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  ok("advanced lesson unlocked for a diploma holder", unlocked);
  ok("holder badge in header", await hp.getByTestId("holder-badge").isVisible().catch(() => false));
  await hp.screenshot({ path: OUT + "14-advanced-unlocked-holder.png" });
  await hp.goto(R0 + "/diploma", { waitUntil: "networkidle" });
  await hp.getByTestId("diploma-card").waitFor({ timeout: 20000 }).catch(() => {});
  await hp.screenshot({ path: OUT + "15-diploma-holder-share.png" });
  await holderCtx.close();
} catch (error) {
  ok("unexpected error", false, String(error));
  for (const [i, p] of ctx.pages().entries()) await p.screenshot({ path: OUT + `error-${i}.png` }).catch(() => {});
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
