import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const STORAGE_PATH = path.join(__dirname, '.auth.json');

setup('autentica e salva storage', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill('tiago@asv.digital');
  await page.getByLabel(/senha/i).fill('zappfy123');
  await page.getByRole('button', { name: /entrar/i }).click();
  // espera redirect pra /grupos (rota principal pos-login)
  await expect(page).toHaveURL(/\/grupos/, { timeout: 10_000 });
  await page.context().storageState({ path: STORAGE_PATH });
});
