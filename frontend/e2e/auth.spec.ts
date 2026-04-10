import { test, expect } from '@playwright/test';
import { registerUser, loginUser, registerAndLogin } from './helpers';

const RUN = Date.now();
const PW = 'Test@1234';

test('redirects unauthenticated user from /subnets to /login', async ({ page }) => {
  await page.goto('/subnets');
  await expect(page).toHaveURL(/\/login/);
});

test('shows login form by default', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Subnet Manager' })).toBeVisible();
  await expect(page.getByText('Sign in to your account')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('switches to register mode', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Create a new account')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
});

test('shows live password rules while typing', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register' }).click();

  const pwInput = page.locator('input[autocomplete="new-password"]').first();
  await pwInput.fill('a');

  // All rules are visible; some should be red
  await expect(page.getByText('At least 8 characters')).toBeVisible();
  await expect(page.getByText('One uppercase letter')).toBeVisible();
  await expect(page.getByText('One number')).toBeVisible();

  // After filling a stronger password all rules should turn green
  await pwInput.fill(PW);
  await expect(page.getByText('At least 8 characters')).toBeVisible();
  await expect(page.getByText('One special character (!@#…)')).toBeVisible();
});

test('cannot register with mismatched passwords', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByPlaceholder('you@example.com').fill(`mismatch${RUN}@e2e.com`);
  await page.locator('input[autocomplete="new-password"]').first().fill(PW);
  await page.locator('input[autocomplete="new-password"]').last().fill('Different@9');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText("Passwords don't match")).toBeVisible();
});

test('cannot register with invalid email', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByPlaceholder('you@example.com').fill('not-an-email');
  await page.locator('input[autocomplete="new-password"]').first().fill(PW);
  await page.locator('input[autocomplete="new-password"]').last().fill(PW);

  // Disable browser-native email validation so React-Hook-Form / Zod runs
  await page.locator('form').evaluate((f: HTMLFormElement) => { f.noValidate = true; });

  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Invalid email')).toBeVisible();
});

test('can register a new user and is redirected to login mode', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByPlaceholder('you@example.com').fill(`reg${RUN}@e2e.com`);
  await page.locator('input[autocomplete="new-password"]').first().fill(PW);
  await page.locator('input[autocomplete="new-password"]').last().fill(PW);
  await page.getByRole('button', { name: 'Create account' }).click();

  // Toast confirms registration
  await expect(page.getByText('Account created')).toBeVisible({ timeout: 10_000 });
  // Mode switches back to login
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('shows error on duplicate email registration', async ({ page }) => {
  const email = `dup${RUN}@e2e.com`;
  await registerUser(page, email, PW);

  // Try to register the same email again
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(PW);
  await page.locator('input[autocomplete="new-password"]').last().fill(PW);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Email already registered')).toBeVisible({ timeout: 10_000 });
});

test('can log in with valid credentials and lands on /subnets', async ({ page }) => {
  const email = `login${RUN}@e2e.com`;
  await registerUser(page, email, PW);
  await loginUser(page, email, PW);

  await expect(page).toHaveURL(/\/subnets/);
  await expect(page.getByRole('heading', { name: 'Subnets' })).toBeVisible();
});

test('shows error on wrong password', async ({ page }) => {
  const email = `wrongpw${RUN}@e2e.com`;
  await registerUser(page, email, PW);

  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill('Wrong@9999');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 10_000 });
});

test('shows error for unknown email', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(`nouser${RUN}@e2e.com`);
  await page.locator('input[autocomplete="current-password"]').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 10_000 });
});

test('can log out via the navbar user menu', async ({ page }) => {
  const email = `logout${RUN}@e2e.com`;
  await registerAndLogin(page, email, PW);

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
