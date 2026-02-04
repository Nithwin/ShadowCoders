
import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check for landing page text (e.g., ShadowCoders or similar)
    // Adjust based on actual landing page content
    await expect(page).toHaveTitle(/Shadow/i);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Find a link to login or navigate directly
    await page.goto('/login');
    
    await expect(page.getByRole('heading', { name: /ShadowCoders/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Email address/i)).toBeVisible();
  });
});
