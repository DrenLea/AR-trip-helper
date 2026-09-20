import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('global city search focuses the globe and exposes package status', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '你想去哪里？' })).toBeVisible();
  await page.getByLabel('搜索任何城市').fill('Paris');
  await page.getByRole('button', { name: '搜索' }).click();
  await expect(page.getByRole('button', { name: /巴黎|Paris/ }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/尚未加载数据包|可生成基础包|在线探索/).last()).toBeVisible();
});

test('installed city opens progressive questions and a pace-aware plan', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('搜索任何城市').fill('罗马');
  await page.getByRole('button', { name: '搜索' }).click();
  await page.getByRole('button', { name: /罗马/ }).last().click();
  await page.getByRole('button', { name: '为我规划这趟旅程' }).click();
  await expect(page.getByRole('heading', { name: '让我更懂你的旅行节奏' })).toBeVisible();
  await page.getByLabel('你想要的节奏').selectOption({ label: '轻松慢游' });
  await page.getByRole('button', { name: /生成我的旅行草稿/ }).click();
  await expect(page.getByText(/步行/).first()).toBeVisible();
  await expect(page.getByText(/开启相机导览|百科资料/).first()).toBeVisible();
});
