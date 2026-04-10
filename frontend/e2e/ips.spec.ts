import { test, expect } from '@playwright/test';
import { registerAndLogin, loginUser, uniqueCIDR, nthHost } from './helpers';

const RUN = Date.now();
const EMAIL = `ips${RUN}@e2e.com`;
const PW = 'Test@1234';
const SUBNET_NAME = `IPNet_${RUN}`;
const SUBNET_ADDR = uniqueCIDR();

// Captured after navigating to the IP list for the first time
let ipsPageURL: string;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await registerAndLogin(page, EMAIL, PW);

  // Create the subnet we'll use for all IP tests
  await page.getByRole('button', { name: 'Add Subnet' }).click();
  await page.getByPlaceholder('e.g. Office LAN').fill(SUBNET_NAME);
  await page.getByPlaceholder('e.g. 192.168.1.0/24').fill(SUBNET_ADDR);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('td', { hasText: SUBNET_NAME })).toBeVisible({ timeout: 10_000 });

  // Navigate to the IP list and capture the URL
  await page.locator('tr', { hasText: SUBNET_NAME }).getByTitle('View IPs').click();
  await page.waitForURL(/\/subnets\/\d+\/ips/);
  ipsPageURL = page.url();

  await page.close();
});

test.beforeEach(async ({ page }) => {
  await loginUser(page, EMAIL, PW);
  await page.goto(ipsPageURL);
  await expect(page.getByRole('heading', { name: SUBNET_NAME })).toBeVisible({ timeout: 10_000 });
});

// ─── Page loads ───────────────────────────────────────────────────────────────

test('shows subnet name and Add IP button', async ({ page }) => {
  await expect(page.getByRole('heading', { name: SUBNET_NAME })).toBeVisible();
  await expect(page.getByText(SUBNET_ADDR)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add IP' })).toBeVisible();
});

test('can toggle Network Info panel', async ({ page }) => {
  await page.getByRole('button', { name: 'Network Info' }).click();
  await expect(page.getByText('First Usable:')).toBeVisible();
  await expect(page.getByText('Usable Hosts:')).toBeVisible();
});

test('can navigate back to Subnets', async ({ page }) => {
  await page.getByText('Back to Subnets').click();
  await expect(page).toHaveURL(/\/subnets$/);
  await expect(page.getByRole('heading', { name: 'Subnets' })).toBeVisible();
});

// ─── Add IP ───────────────────────────────────────────────────────────────────

test('can add an IP address', async ({ page }) => {
  const ip = nthHost(SUBNET_ADDR, 10);

  await page.getByRole('button', { name: 'Add IP' }).click();
  await expect(page.getByRole('heading', { name: 'Add IP Address' })).toBeVisible();

  await page.getByPlaceholder('e.g. 192.168.1.10').fill(ip);
  await page.getByRole('button', { name: 'Add IP' }).last().click();

  await expect(page.locator('td', { hasText: ip })).toBeVisible({ timeout: 10_000 });
});

test('shows error for IP outside subnet range', async ({ page }) => {
  await page.getByRole('button', { name: 'Add IP' }).click();
  await page.getByPlaceholder('e.g. 192.168.1.10').fill('172.16.0.1');
  await page.getByRole('button', { name: 'Add IP' }).last().click();

  await expect(page.getByText('does not belong to subnet')).toBeVisible({ timeout: 10_000 });
});

// ─── Edit IP ──────────────────────────────────────────────────────────────────

test('can edit an IP address', async ({ page }) => {
  const original = nthHost(SUBNET_ADDR, 20);
  const updated  = nthHost(SUBNET_ADDR, 21);

  // Add the IP first
  await page.getByRole('button', { name: 'Add IP' }).click();
  await page.getByPlaceholder('e.g. 192.168.1.10').fill(original);
  await page.getByRole('button', { name: 'Add IP' }).last().click();
  await expect(page.locator('td', { hasText: original })).toBeVisible({ timeout: 10_000 });

  // Edit it
  await page.locator('tr', { hasText: original }).getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: 'Edit IP Address' })).toBeVisible();

  await page.getByPlaceholder('e.g. 192.168.1.10').clear();
  await page.getByPlaceholder('e.g. 192.168.1.10').fill(updated);
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.locator('td', { hasText: updated })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('td', { hasText: original })).not.toBeVisible();
});

// ─── Delete IP ────────────────────────────────────────────────────────────────

test('can delete an IP address', async ({ page }) => {
  const ip = nthHost(SUBNET_ADDR, 30);

  // Add the IP first
  await page.getByRole('button', { name: 'Add IP' }).click();
  await page.getByPlaceholder('e.g. 192.168.1.10').fill(ip);
  await page.getByRole('button', { name: 'Add IP' }).last().click();
  await expect(page.locator('td', { hasText: ip })).toBeVisible({ timeout: 10_000 });

  // Delete it
  await page.locator('tr', { hasText: ip }).getByRole('button').last().click();
  await expect(page.getByRole('heading', { name: 'Delete IP' })).toBeVisible();
  await page.locator('.fixed.inset-0').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('IP deleted')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('td', { hasText: ip })).not.toBeVisible();
});
