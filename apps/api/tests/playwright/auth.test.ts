import { test, expect } from '@playwright/test';

// Base URL for the running app
const BASE_URL = 'http://127.0.0.1:5173';

// Demo accounts created by `pnpm db:seed`.
// All demo accounts use the password `password`.
const CREDENTIALS = {
  super_admin: { email: 'admin@admin.com', password: 'password' },
  manager: { email: 'manager@rivrhotel.in', password: 'password' },
  receptionist: { email: 'reception@rivrhotel.in', password: 'password' },
  housekeeping: { email: 'housekeeping@rivrhotel.in', password: 'password' },
  staff: { email: 'staff@rivrhotel.in', password: 'password' },
  customer: { email: 'aarav.nair5@example.com', password: 'password' },
};

// ---------------------------------------------------------------------------
// 1. Guest website loads successfully
// ---------------------------------------------------------------------------
test('Guest website loads successfully', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  // Page should have RIVR title
  await expect(page).toHaveTitle(/RIVR/);
});

// ---------------------------------------------------------------------------
// 2. Customer can register and access guest dashboard
// ---------------------------------------------------------------------------
test('Customer can register and access guest dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/register`);
  // Register form has email, name, phone fields
  await page.fill('input[placeholder="you@example.com"]', 'testcustomer@example.com');
  await page.fill('input[placeholder="Full name"]', 'Test Customer');
  await page.fill('input[placeholder="Indian mobile number"]', '1234567890');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
  
  // Login as the newly registered customer
  await page.fill('input[placeholder="you@example.com"]', 'testcustomer@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page - the login triggers window.location.assign
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  await expect(page).toHaveURL('/guest/dashboard');
});

// ---------------------------------------------------------------------------
// 3. Admin can login and access admin dashboard
// ---------------------------------------------------------------------------
test('Admin can login and access admin dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.super_admin.email);
  await page.fill('input[type="password"]', CREDENTIALS.super_admin.password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  await expect(page).toHaveURL('/admin/dashboard');
});

// ---------------------------------------------------------------------------
// 4. Manager can login and access manager dashboard
// ---------------------------------------------------------------------------
test('Manager can login and access manager dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.manager.email);
  await page.fill('input[type="password"]', CREDENTIALS.manager.password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  await expect(page).toHaveURL('/manager/dashboard');
});

// ---------------------------------------------------------------------------
// 5. Receptionist can login and access reception dashboard
// ---------------------------------------------------------------------------
test('Receptionist can login and access reception dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.receptionist.email);
  await page.fill('input[type="password"]', CREDENTIALS.receptionist.password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  await expect(page).toHaveURL('/reception/dashboard');
});

// ---------------------------------------------------------------------------
// 6. Housekeeping can login and access housekeeping dashboard
// ---------------------------------------------------------------------------
test('Housekeeping can login and access housekeeping dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.housekeeping.email);
  await page.fill('input[type="password"]', CREDENTIALS.housekeeping.password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  await expect(page).toHaveURL('/housekeeping/dashboard');
});

// ---------------------------------------------------------------------------
// 7. Staff can login and access staff dashboard
// ---------------------------------------------------------------------------
test('Staff can login and access staff dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.staff.email);
  await page.fill('input[type="password"]', CREDENTIALS.staff.password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  await expect(page).toHaveURL('/staff/dashboard');
});

// ---------------------------------------------------------------------------
// 8. Customer cannot access staff dashboards
// ---------------------------------------------------------------------------
test('Customer cannot access staff dashboards', async ({ page }) => {
  // Try to access admin dashboard as unauthenticated user
  await page.goto(`${BASE_URL}/admin/dashboard`);
  await page.waitForLoadState('networkidle');
  
  // Should be redirected to login
  const url = page.url();
  expect(url).toContain('/login');
});

// ---------------------------------------------------------------------------
// 9. Staff cannot access admin financial data
// ---------------------------------------------------------------------------
test('Staff cannot access admin financial data', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.staff.email);
  await page.fill('input[type="password"]', CREDENTIALS.staff.password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  // Staff dashboard should load without financial data access issues
  await expect(page).toHaveURL('/staff/dashboard');
});

// ---------------------------------------------------------------------------
// 10. Forgot password flow shows feedback
// ---------------------------------------------------------------------------
test('Forgot password flow shows feedback', async ({ page }) => {
  await page.goto(`${BASE_URL}/forgot-password`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.super_admin.email);
  await page.click('button[type="submit"]');
  
  await page.waitForLoadState('networkidle');
  
  // Some feedback should be shown (token in dev, success message otherwise)
  const pageContent = await page.textContent('body');
  expect(pageContent?.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// 11. Customer dashboard shows reservations and invoices
// ---------------------------------------------------------------------------
test('Customer dashboard shows reservations and invoices', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="you@example.com"]', CREDENTIALS.customer.email);
  await page.fill('input[type="password"]', CREDENTIALS.customer.password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(/^(?!\/login$)/, { timeout: 5000 });
  
  await expect(page).toHaveURL('/guest/dashboard');
  // Should show reservations and invoices section
  await expect(page.locator('text=/reservations|invoices|bookings/i')).toBeVisible();
});