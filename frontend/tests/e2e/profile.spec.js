import { expect, test } from '@playwright/test';
import { mockAuthenticatedUser } from './helpers';

test.describe('profile page updates', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('removes deprecated sections and persists unit preference', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toHaveCount(0);
    await expect(page.getByText('Theme')).toHaveCount(0);
    await expect(page.getByText('Private Profile')).toHaveCount(0);
    await expect(page.getByText('Security & Biometrics')).toHaveCount(0);
    await expect(page.getByText('Connected Accounts')).toHaveCount(0);

    const unitsRow = page.getByRole('button', { name: /Units Kilometers/i });
    await expect(unitsRow).toBeVisible();
    await unitsRow.click();
    await expect(page.getByRole('button', { name: /Units Miles/i })).toBeVisible();

    await expect(page.evaluate(() => localStorage.getItem('medio_units'))).resolves.toBe('imperial');
  });

  test('opens all support and legal rows as real pages', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: /How to Use Medio/i }).click();
    await expect(page).toHaveURL(/\/guide$/);
    await page.goto('/profile');

    await page.getByRole('button', { name: /Contact Support/i }).click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByRole('heading', { name: 'Contact Support' })).toBeVisible();
    await page.goto('/profile');

    await page.getByRole('button', { name: /About Medio/i }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('heading', { name: 'About MEDIO' })).toBeVisible();
    await page.goto('/profile');

    await page.getByRole('button', { name: /Privacy Policy/i }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
    await page.goto('/profile');

    await page.getByRole('button', { name: /Terms & Conditions/i }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { name: 'Terms & Conditions' })).toBeVisible();
  });
});
