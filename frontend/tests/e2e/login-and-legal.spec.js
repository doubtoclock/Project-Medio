import { expect, test } from '@playwright/test';
import { mockUnauthenticatedUser } from './helpers';

test.describe('login and legal pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticatedUser(page);
  });

  test('shows Google-only login and requires legal consent', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();

    await expect(page.getByLabel(/Email address/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Send code/i })).toHaveCount(0);
    await expect(page.getByText('or')).toHaveCount(0);

    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });

  test('links to privacy policy and terms from login', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Privacy Policy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
    await expect(page.getByText('saved places, place labels and addresses')).toBeVisible();

    await page.goto('/login');
    await page.getByRole('button', { name: 'Terms & Conditions' }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { name: 'Terms & Conditions' })).toBeVisible();
    await expect(page.getByText('Governing Law')).toBeVisible();
  });
});
