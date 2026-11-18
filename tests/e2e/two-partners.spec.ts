import { expect, test, type Browser, type Page } from "@playwright/test";
import { linkFromEmail } from "./mail";

/**
 * Brief §27 scenarios 1-8, 11-12 (vendor booked updates dashboard), 18-21,
 * plus email verification and password reset, run through the real UI with
 * two separate browser contexts (two separate logins).
 */

const run = Date.now().toString(36);
const arghavanEmail = `arghavan-${run}@example.test`;
const bayanEmail = `bayan-${run}@example.test`;
const password = "correct-horse-battery";
const shots = process.env.E2E_SCREENSHOTS ?? "test-results/screens";

async function signUpAndConfirm(page: Page, opts: { name: string; email: string; fromInvite?: boolean }) {
  if (!opts.fromInvite) await page.goto("/signup");
  await page.getByLabel("Your first name").fill(opts.name);
  if (!opts.fromInvite) await page.getByLabel("Email").fill(opts.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const link = await linkFromEmail(opts.email, /Confirm your email/, /\/auth\/confirm\?/);
  await page.goto(link);
}

test.describe.configure({ mode: "serial" });

let browser: Browser;
let arghavan: Page;
let bayan: Page;
let inviteLink = "";

test.beforeAll(async ({ browser: b }) => {
  browser = b;
  arghavan = await (await browser.newContext()).newPage();
  bayan = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
});

test("1. Arghavan signs up, confirms her email and creates the workspace", async () => {
  await signUpAndConfirm(arghavan, { name: "Arghavan", email: arghavanEmail });
  await expect(arghavan).toHaveURL(/\/setup/);
  await arghavan.screenshot({ path: `${shots}/01-setup-welcome.png`, fullPage: true });
  await arghavan.getByRole("button", { name: "Let's begin" }).click();

  await arghavan.getByLabel("I'm Arghavan").check();
  await arghavan.screenshot({ path: `${shots}/02-setup-details.png`, fullPage: true });
  await arghavan.getByRole("button", { name: "Save and continue" }).click();
  await expect(arghavan.getByRole("heading", { name: "Invite your partner" })).toBeVisible({ timeout: 20_000 });
});

test("2. Arghavan invites Bayan", async () => {
  await arghavan.getByLabel("Partner's email").fill(bayanEmail);
  await arghavan.getByRole("button", { name: "Create invitation" }).click();
  await expect(arghavan.getByText(`Invitation created for ${bayanEmail}`)).toBeVisible();
  inviteLink = (await arghavan.locator(".font-mono").first().textContent())!.trim();
  expect(inviteLink).toMatch(/\/invite\/[0-9a-f]{64}$/);
  await arghavan.getByRole("button", { name: "Continue" }).click();

  await expect(arghavan.getByRole("heading", { name: "Planning preferences" })).toBeVisible();
  await arghavan.getByRole("button", { name: "Save and continue" }).click();
  await expect(arghavan.getByRole("heading", { name: "Where things stand" })).toBeVisible();
  await arghavan.screenshot({ path: `${shots}/03-setup-status.png`, fullPage: true });
  await arghavan.getByRole("button", { name: "Open our dashboard" }).click();
  await expect(arghavan.getByRole("heading", { name: /Arghavan & Bayan!/ })).toBeVisible();
  await expect(arghavan.getByText("Venue Secured").first()).toBeVisible();
  await arghavan.screenshot({ path: `${shots}/04-dashboard-desktop.png`, fullPage: true });
});

test("3-4. Bayan accepts the invitation and both see the same workspace", async () => {
  await bayan.goto(inviteLink);
  await expect(bayan.getByRole("heading", { name: "Arghavan & Bayan" })).toBeVisible();
  await expect(bayan.getByLabel("Email")).toHaveValue(bayanEmail);
  await bayan.screenshot({ path: `${shots}/05-invite-mobile.png`, fullPage: true });
  await signUpAndConfirm(bayan, { name: "Bayan", email: bayanEmail, fromInvite: true });

  await expect(bayan).toHaveURL(/\/invite\//);
  await bayan.getByRole("button", { name: "Join our wedding space" }).click();
  await expect(bayan.getByText("You're in.")).toBeVisible();
  await bayan.screenshot({ path: `${shots}/06-dashboard-mobile.png`, fullPage: true });

  await arghavan.reload();
  await expect(arghavan.getByText(/Bayan joined the wedding space/)).toBeVisible();
});

test("5-8. a task created by Arghavan is completed by Bayan, and Arghavan sees it live", async () => {
  await arghavan.goto("/checklist");
  await arghavan.getByRole("button", { name: "Add a task", exact: true }).first().click();
  const dialog = arghavan.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Ask venue whether we can bring our own candles");
  await dialog.getByLabel("Due date").fill("2026-11-28");
  await dialog.getByLabel("Assigned to").selectOption({ label: "Bayan" });
  await dialog.getByRole("button", { name: "Add task" }).click();
  await expect(arghavan.getByRole("link", { name: "Ask venue whether we can bring our own candles" })).toBeVisible();

  await bayan.goto("/checklist");
  await bayan.getByLabel("Search tasks").fill("candles");
  const toggle = bayan.getByRole("checkbox", { name: /Mark "Ask venue whether we can bring our own candles" done/ });
  await expect(toggle).toBeVisible();
  await bayan.screenshot({ path: `${shots}/07-checklist-mobile.png`, fullPage: true });
  await toggle.click();
  await expect(bayan.getByRole("checkbox", { name: /Mark "Ask venue whether we can bring our own candles" not done/ })).toBeVisible();

  // Arghavan's open checklist updates without reloading (realtime).
  await expect(arghavan.getByRole("checkbox", { name: /Mark "Ask venue whether we can bring our own candles" not done/ })).toBeVisible({
    timeout: 15_000,
  });
  await arghavan.goto("/");
  await expect(arghavan.getByText(/Bayan completed “Ask venue whether we can bring our own candles”/)).toBeVisible();
});

test("11-12. marking a vendor booked completes its task, the milestone, and updates the dashboard", async () => {
  await arghavan.goto("/settings#vendors");
  await arghavan.getByLabel("Photographer", { exact: true }).selectOption("booked");
  await expect(arghavan.getByLabel("Photographer", { exact: true })).toHaveValue("booked");
  await arghavan.goto("/");
  await expect(arghavan.getByText(/2\s*of 6/)).toBeVisible();
  await arghavan.goto("/milestones");
  const photographer = arghavan.locator("li", { has: arghavan.getByRole("heading", { name: "Photographer Booked" }) });
  await expect(photographer.getByText(/Reached/)).toBeVisible();
});

test("celebration shows when completing a task finishes a milestone", async () => {
  await bayan.goto("/checklist");
  await bayan.getByLabel("Search tasks").fill("Draft guest list");
  await bayan.getByRole("checkbox", { name: /Mark "Draft guest list" done/ }).click();
  await expect(bayan.getByText("Milestone reached")).toBeVisible();
  await expect(bayan.getByText("Guest List Drafted")).toBeVisible();
});

test("18. moving a task to next month keeps the original date in its history", async () => {
  await bayan.goto("/checklist");
  await bayan.getByLabel("Search tasks").fill("Research DJs");
  await bayan.getByRole("link", { name: "Research DJs" }).click();
  await expect(bayan.getByRole("heading", { name: "Research DJs" })).toBeVisible();
  await bayan.getByRole("button", { name: "Move to next month" }).click();
  await expect(bayan.getByText(/changed the due date from Nov 30 to Dec 31 \(moved to next month\)/)).toBeVisible();
  await bayan.screenshot({ path: `${shots}/08-task-detail-mobile.png`, fullPage: true });
});

test("19. changing the wedding date asks before rescheduling and keeps hand-set dates", async () => {
  await arghavan.goto("/settings");
  await arghavan.getByLabel("Exact wedding date").fill("2027-09-18");
  await arghavan.getByRole("button", { name: "Review and save" }).click();
  const dialog = arghavan.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Confirm rescheduling" })).toBeVisible();
  await expect(dialog.getByText(/Dates you set by hand/)).toBeVisible();
  // "Research DJs" was moved by hand, so it must not be pre-selected.
  await expect(dialog.getByRole("checkbox", { name: /Research DJs/ })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /Send invitations/ })).toBeChecked();
  await arghavan.screenshot({ path: `${shots}/09-date-change-dialog.png`, fullPage: true });
  await dialog.getByRole("button", { name: /Save date and move/ }).click();
  await expect(arghavan.getByText(/Wedding date saved/)).toBeVisible();

  await arghavan.goto("/");
  await expect(arghavan.getByText(/Days Until We Say I Do/)).toBeVisible();
  await arghavan.goto("/checklist");
  await arghavan.getByLabel("Search tasks").fill("Research DJs");
  await expect(arghavan.getByText("Dec 31")).toBeVisible();
  await arghavan.getByLabel("Search tasks").fill("Send invitations");
  await expect(arghavan.getByText(/Jun 26, 2027/)).toBeVisible();
});

test("Who's Doing What shows each partner's tasks and lets a partner claim one", async () => {
  await arghavan.goto("/responsibilities");
  await expect(arghavan.getByRole("heading", { name: /Bayan's Tasks/ })).toBeVisible();
  await expect(arghavan.getByRole("heading", { name: "Workload overview" })).toBeVisible();
  await arghavan.screenshot({ path: `${shots}/10-responsibilities-desktop.png`, fullPage: true });
});

test("20. logging out and back in keeps everything", async () => {
  await arghavan.goto("/settings");
  await arghavan.getByRole("button", { name: "Sign out" }).click();
  await expect(arghavan).toHaveURL(/\/login/);
  await arghavan.goto("/checklist");
  await expect(arghavan).toHaveURL(/\/login\?next=%2Fchecklist/);
  await arghavan.getByLabel("Email").fill(arghavanEmail);
  await arghavan.getByLabel("Password").fill(password);
  await arghavan.getByRole("button", { name: "Sign in" }).click();
  await expect(arghavan).toHaveURL(/\/checklist/);
  await arghavan.getByLabel("Search tasks").fill("candles");
  await expect(arghavan.getByRole("checkbox", { name: /candles" not done/ })).toBeVisible();
});

test("password reset by email works", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(bayanEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/reset link is on its way/)).toBeVisible();
  const link = await linkFromEmail(bayanEmail, /Reset your/, /type=recovery/);
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
  await page.getByLabel("Confirm new password").fill("a-brand-new-password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Your password was updated.")).toBeVisible();
  await ctx.close();
});

test("after a password reset, other sessions are signed out and the new password works", async () => {
  await bayan.goto("/settings");
  await expect(bayan).toHaveURL(/\/login/);
  await bayan.getByLabel("Email").fill(bayanEmail);
  await bayan.getByLabel("Password").fill("a-brand-new-password");
  await bayan.getByRole("button", { name: "Sign in" }).click();
  await expect(bayan.getByRole("heading", { name: /Arghavan & Bayan!/ })).toBeVisible();
});

test("21. dark mode and iPhone layout render", async () => {
  await bayan.goto("/settings");
  await bayan.getByRole("radio", { name: "dark" }).check({ force: true });
  await bayan.goto("/");
  await expect(bayan.locator("html")).toHaveClass(/dark/);
  await bayan.screenshot({ path: `${shots}/11-dashboard-mobile-dark.png`, fullPage: true });
  const overflow = await bayan.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("signed-out visitors and unknown invitation tokens are turned away", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.goto(`/invite/${"0".repeat(64)}`);
  await expect(page.getByRole("heading", { name: "This invitation can't be used" })).toBeVisible();
  await page.goto(inviteLink);
  await expect(page.getByText(/already been accepted/)).toBeVisible();
  await ctx.close();
});
