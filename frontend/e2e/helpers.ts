import type { Page } from '@playwright/test';

// Unique seed per test run — prevents address/email conflicts across runs
const RUN_MS = Date.now();
let _subnetIdx = 0;

/** Generates a unique /24 CIDR block for each call within a run */
export function uniqueCIDR(): string {
  const n = ((RUN_MS % 65536) + _subnetIdx++) % 65536;
  const b = Math.floor(n / 256);
  const c = n % 256;
  return `10.${b}.${c}.0/24`;
}

/** Returns the Nth host address inside a given subnet CIDR */
export function nthHost(cidr: string, n: number): string {
  const base = cidr.replace(/\.0\/\d+$/, '');
  return `${base}.${n}`;
}

/** Registers a new account. After this call the page is in login mode. */
export async function registerUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').last().fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByText('Account created').waitFor({ timeout: 10_000 });
}

/** Logs in and waits for the /subnets page. */
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/subnets/, { timeout: 10_000 });
}

/** Registers then logs in. Page ends on /subnets. */
export async function registerAndLogin(page: Page, email: string, password: string) {
  await registerUser(page, email, password);
  await loginUser(page, email, password);
}
