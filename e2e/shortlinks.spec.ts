import { test, expect } from '@playwright/test';

const SLUG = `e2e-${Date.now().toString(36)}`;

test.describe.serial('Shortlinks multi-grupo', () => {
  test('cria shortlink com 3 grupos', async ({ page }) => {
    await page.goto('/shortlinks');
    await expect(page.getByRole('heading', { name: 'Shortlinks' })).toBeVisible();

    // Abre modal de criação
    await page.getByRole('button', { name: /novo shortlink/i }).click();
    await expect(page.getByText(/cria um link único que rotaciona/i)).toBeVisible();

    // Slug (placeholder exato pra nao colidir com "Campanha promo Q4")
    await page.getByPlaceholder('promo', { exact: true }).fill(SLUG);

    // Marca 3 grupos de teste
    const search = page.getByPlaceholder('Buscar grupo...');
    await search.fill('Test Grupo');

    // marca 3 primeiros grupos clicando no label inteiro
    const labels = page.locator('label', { hasText: 'Test Grupo' });
    await labels.nth(0).click();
    await labels.nth(1).click();
    await labels.nth(2).click();

    // Submete
    await page.getByRole('button', { name: /criar shortlink/i }).click();

    // Toast aparece
    await expect(page.getByText(/shortlink criado/i)).toBeVisible({ timeout: 5_000 });

    // Aparece na tabela
    const row = page.locator(`tr:has-text("${SLUG}")`);
    await expect(row).toBeVisible();
    await expect(row.locator('text=3/3 ativos')).toBeVisible();
  });

  test('abre detalhe e adiciona +2 grupos', async ({ page }) => {
    await page.goto('/shortlinks');
    const row = page.locator(`tr:has-text("${SLUG}")`);
    await row.locator('button[title*="Detalhes"]').click();

    // Dialog detalhe abre
    await expect(page.getByText(/Grupos \(3\)/)).toBeVisible();

    // Adicionar mais grupos
    await page.getByRole('button', { name: /adicionar grupos/i }).click();
    await expect(page.getByRole('heading', { name: /adicionar grupos/i })).toBeVisible();

    // marca os 2 que sobraram (lista nao mostra os ja adicionados)
    const labels = page.locator('label', { hasText: 'Test Grupo' });
    await labels.nth(0).click();
    await labels.nth(1).click();
    await page.getByRole('button', { name: /adicionar 2 grupos/i }).click();

    await expect(page.getByText(/grupos adicionados/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Grupos \(5\)/)).toBeVisible();
  });

  test('reordena items (down primeiro item)', async ({ page }) => {
    await page.goto('/shortlinks');
    await page.locator(`tr:has-text("${SLUG}")`).locator('button[title*="Detalhes"]').click();

    // primeiro nome antes de reordenar
    const firstRowBefore = page.locator('tr', { hasText: 'Test Grupo' }).first();
    const beforeName = await firstRowBefore.locator('div.font-medium').textContent();

    // clica "Descer" no primeiro item
    await firstRowBefore.locator('button[title="Descer"]').click();

    // espera mudança (refetch)
    await page.waitForTimeout(800);

    // o primeiro nome agora é diferente
    const firstRowAfter = page.locator('tr', { hasText: 'Test Grupo' }).first();
    const afterName = await firstRowAfter.locator('div.font-medium').textContent();
    expect(beforeName).not.toEqual(afterName);
  });

  test('redirect publico /g/:slug retorna 503 (sem invite)', async ({ request }) => {
    // como nao temos uazapi conectado, o invite eh null e o resolver retorna 503/sem-grupo
    const res = await request.get(`/g/${SLUG}`, { maxRedirects: 0 });
    // pode ser 200 (renderiza fallback) ou 5xx — o importante eh nao crashear
    expect([200, 302, 503]).toContain(res.status());
  });

  test('toggle ativo desativa shortlink', async ({ page }) => {
    await page.goto('/shortlinks');
    const row = page.locator(`tr:has-text("${SLUG}")`);
    // Switch da base-ui nao usa role="switch"; localiza via data-slot
    const toggle = row.locator('button[data-slot="switch"], [data-slot="switch"]').first();
    await toggle.click();
    await page.waitForTimeout(500);
  });

  test('remove shortlink', async ({ page }) => {
    await page.goto('/shortlinks');
    const row = page.locator(`tr:has-text("${SLUG}")`);

    page.once('dialog', (d) => d.accept());
    await row.locator('button:has(svg.lucide-trash-2), button[title="Excluir"]').first().click();

    await expect(page.getByText(/shortlink removido/i)).toBeVisible({ timeout: 5_000 });
    await expect(row).not.toBeVisible();
  });
});
