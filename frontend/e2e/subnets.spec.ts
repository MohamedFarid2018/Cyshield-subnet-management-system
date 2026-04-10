import { test, expect } from '@playwright/test';
import { registerAndLogin, loginUser, uniqueCIDR } from './helpers';

const RUN = Date.now();
const EMAIL = `subnets${RUN}@e2e.com`;
const PW = 'Test@1234';

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await registerAndLogin(page, EMAIL, PW);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  await loginUser(page, EMAIL, PW);
});

// ─── Page loads ───────────────────────────────────────────────────────────────

test('shows Subnets heading and Add Subnet button', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Subnets' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Subnet' })).toBeVisible();
});

// ─── Create ───────────────────────────────────────────────────────────────────

test('can create a subnet', async ({ page }) => {
  const name = `LAN_${RUN}`;
  const addr = uniqueCIDR();

  await page.getByRole('button', { name: 'Add Subnet' }).click();
  await expect(page.getByRole('heading', { name: 'New Subnet' })).toBeVisible();

  await page.getByPlaceholder('e.g. Office LAN').fill(name);
  await page.getByPlaceholder('e.g. 192.168.1.0/24').fill(addr);
  await page.getByRole('button', { name: 'Create' }).click();

  // Row appears in the table
  await expect(page.locator('td', { hasText: name })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('td', { hasText: addr })).toBeVisible();
});

test('shows error for invalid CIDR on create', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Subnet' }).click();
  await page.getByPlaceholder('e.g. Office LAN').fill('Bad Subnet');
  await page.getByPlaceholder('e.g. 192.168.1.0/24').fill('not-a-cidr');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('Invalid CIDR notation')).toBeVisible({ timeout: 10_000 });
});

// ─── Search ───────────────────────────────────────────────────────────────────

test('can search for a subnet by name', async ({ page }) => {
  const name = `SearchMe_${RUN}`;
  const addr = uniqueCIDR();

  // Create a subnet to search for
  await page.getByRole('button', { name: 'Add Subnet' }).click();
  await page.getByPlaceholder('e.g. Office LAN').fill(name);
  await page.getByPlaceholder('e.g. 192.168.1.0/24').fill(addr);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('td', { hasText: name })).toBeVisible({ timeout: 10_000 });

  // Search using the unique name
  await page.getByPlaceholder('Search by name or address…').fill(name);
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.locator('td', { hasText: name })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('No subnets found')).not.toBeVisible();
});

// ─── Edit ────────────────────────────────────────────────────────────────────

test('can edit a subnet name', async ({ page }) => {
  const original = `EditBefore_${RUN}`;
  const updated  = `EditAfter_${RUN}`;
  const addr = uniqueCIDR();

  await page.getByRole('button', { name: 'Add Subnet' }).click();
  await page.getByPlaceholder('e.g. Office LAN').fill(original);
  await page.getByPlaceholder('e.g. 192.168.1.0/24').fill(addr);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('td', { hasText: original })).toBeVisible({ timeout: 10_000 });

  // Click the Edit icon on that row
  await page.locator('tr', { hasText: original }).getByTitle('Edit').click();
  await expect(page.getByRole('heading', { name: 'Edit Subnet' })).toBeVisible();

  await page.getByPlaceholder('e.g. Office LAN').clear();
  await page.getByPlaceholder('e.g. Office LAN').fill(updated);
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.locator('td', { hasText: updated })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('td', { hasText: original })).not.toBeVisible();
});

// ─── Delete ───────────────────────────────────────────────────────────────────

test('can delete a subnet', async ({ page }) => {
  const name = `DeleteMe_${RUN}`;
  const addr = uniqueCIDR();

  await page.getByRole('button', { name: 'Add Subnet' }).click();
  await page.getByPlaceholder('e.g. Office LAN').fill(name);
  await page.getByPlaceholder('e.g. 192.168.1.0/24').fill(addr);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('td', { hasText: name })).toBeVisible({ timeout: 10_000 });

  // Click Delete icon, then confirm in the modal
  await page.locator('tr', { hasText: name }).getByTitle('Delete').click();
  await expect(page.getByRole('heading', { name: 'Delete Subnet' })).toBeVisible();
  // Scope to the modal overlay to avoid ambiguity with row-level Delete icons
  await page.locator('.fixed.inset-0').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Subnet deleted')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('td', { hasText: name })).not.toBeVisible();
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test('navigates to IP list when clicking the View IPs icon', async ({ page }) => {
  const name = `ViewIPs_${RUN}`;
  const addr = uniqueCIDR();

  await page.getByRole('button', { name: 'Add Subnet' }).click();
  await page.getByPlaceholder('e.g. Office LAN').fill(name);
  await page.getByPlaceholder('e.g. 192.168.1.0/24').fill(addr);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('td', { hasText: name })).toBeVisible({ timeout: 10_000 });

  await page.locator('tr', { hasText: name }).getByTitle('View IPs').click();

  await expect(page).toHaveURL(/\/subnets\/\d+\/ips/);
  await expect(page.getByRole('heading', { name })).toBeVisible();
});
