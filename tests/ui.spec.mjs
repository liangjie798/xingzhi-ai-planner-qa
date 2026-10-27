import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { capture, evidence, send, day, today } from './helpers.mjs';

const pages = [
  ['/welcome', /行知|计划/],
  ['/login', /用户登录/],
  ['/admin/login', /管理/],
  ['/XingZhi', /从一个想法/],
  ['/hourly', /逐小时环境预报/],
  ['/settings', /配置你的 AI 模型/],
  ['/account', /登录|账户|访客/]
];

for (const [i, [route, heading]] of pages.entries()) {
  test(`UI-${String(i + 1).padStart(3, '0')} desktop route renders without uncaught exceptions: ${route}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await expect(page.locator('body')).toContainText(heading);
    await expect(page).toHaveTitle(/行知/);
    expect(errors).toEqual([]);
  });
  test(`UI-${String(i + 11).padStart(3, '0')} mobile 390px route fits the viewport: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.locator('body')).toContainText(heading);
    const layout = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
    await capture(page, `mobile-${route.replaceAll('/', '')}`);
    expect(layout.scroll).toBeLessThanOrEqual(layout.inner + 1);
  });
}

for (const [i, route] of ['/login', '/XingZhi', '/hourly', '/settings'].entries()) {
  test(`A11Y-${String(i + 1).padStart(3, '0')} serious or critical WCAG 2.1 A/AA violations: ${route}`, async ({ page }) => {
    await page.goto(route);
    if (route === '/XingZhi') await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
    else if (route === '/hourly') await expect(page.locator('.hour-table tbody tr')).toHaveCount(24);
    else if (route === '/settings') await expect(page.getByLabel('模型名称', { exact: true })).toBeVisible();
    else await expect(page.getByLabel('用户名', { exact: true })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const violations = results.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, summary: n.failureSummary })) }));
    await evidence(`a11y-${route.replaceAll('/', '')}`, { violations, incompleteCount: results.incomplete.length, passCount: results.passes.length });
    expect(violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);
  });
}

test('UI-030 guest login reaches a usable workspace', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '访客', exact: true }).click();
  await page.getByRole('button', { name: '建立访客会话' }).click();
  await expect(page).toHaveURL(/\/XingZhi/);
  await expect(page.getByRole('textbox', { name: '问题或规划需求' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
  await capture(page, 'guest-workspace');
});

test('UI-031 invalid login fields use browser validation', async ({ page }) => {
  await page.goto('/login');
  let calls = 0;
  page.on('request', r => { if (r.url().endsWith('/api/v1/auth/login')) calls++; });
  await page.getByLabel('用户名', { exact: true }).fill('!');
  await page.getByLabel('密码', { exact: true }).fill('123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  expect(await page.locator('form').evaluate(f => f.checkValidity())).toBe(false);
  expect(calls).toBe(0);
});

test('UI-032 registration form exposes length and username constraints', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /注册新用户/ }).click();
  await expect(page.getByLabel('显示名称')).toBeVisible();
  await expect(page.getByLabel('用户名', { exact: true })).toHaveAttribute('pattern', '[A-Za-z0-9_]{3,24}');
  await expect(page.getByLabel('密码', { exact: true })).toHaveAttribute('minlength', '8');
});

test('UI-033 empty or whitespace-only conversation cannot be submitted', async ({ page }) => {
  await page.goto('/XingZhi');
  await page.getByRole('textbox', { name: '问题或规划需求' }).fill('   ');
  await expect(page.getByRole('button', { name: '发送分析要求' })).toBeDisabled();
});

test('UI-034 Shift+Enter adds a newline without sending', async ({ page }) => {
  await page.goto('/XingZhi');
  const box = page.getByRole('textbox', { name: '问题或规划需求' });
  await box.fill('第一行');
  await box.press('End');
  await box.press('Shift+Enter');
  await box.press('a');
  await expect(box).toHaveValue('第一行\na');
});

test('UI-035 browser Back restores the previously selected workspace', async ({ page }) => {
  await page.goto('/XingZhi');
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
  await page.getByRole('navigation', { name: '工作区导航' }).getByRole('button', { name: '执行管理', exact: true }).click();
  await expect(page).toHaveURL(/view=execution/);
  await page.getByRole('navigation', { name: '工作区导航' }).getByRole('button', { name: '资料收藏', exact: true }).click();
  await expect(page).toHaveURL(/view=library/);
  await page.goBack();
  await expect(page).toHaveURL(/view=execution/);
  await expect(page.locator('.workspace-context strong')).toHaveText('执行管理');
});

test('UI-036 legacy dashboard bookmark redirects and keeps view query', async ({ page }) => {
  await page.goto('/dashboard?view=archive');
  await expect(page).toHaveURL(/\/XingZhi\?view=archive/);
  await expect(page.locator('.workspace-context strong')).toHaveText('活动档案');
});

test('UI-037 separate conversations survive switching and page reload', async ({ page }) => {
  await page.goto('/XingZhi');
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
  await send(page, '规划杭州明天三天旅游');
  await expect(page.getByRole('region', { name: '对话已确认条件' })).toContainText('杭州市');
  await page.getByRole('button', { name: '新建对话' }).click();
  await expect(page.getByRole('region', { name: '对话已确认条件' })).not.toContainText('杭州市');
  await send(page, '规划北京明天一日旅游');
  await expect(page.getByRole('region', { name: '对话已确认条件' })).toContainText('北京市');
  // Scoped to the visible history list; the current snapshot supplies these button names.
  await page.locator('[aria-label="历史对话"]').getByRole('button').filter({ hasText: '规划杭州' }).click();
  await expect(page.getByRole('region', { name: '对话已确认条件' })).toContainText('杭州市');
  await page.reload();
  await expect(page.getByRole('region', { name: '对话已确认条件' })).toContainText('杭州市');
  await expect(page.getByRole('region', { name: '对话驱动数据分析' })).not.toContainText('规划北京明天一日旅游');
  await capture(page, 'conversation-restored');
});

test('UI-038 two-day tourism end-to-end exports a scheduled route', async ({ page }) => {
  const runtimeErrors = [];
  const warnings = [];
  page.on('pageerror', e => runtimeErrors.push(e.message));
  page.on('console', m => { if (['warning', 'error'].includes(m.type())) warnings.push({ type: m.type(), text: m.text().replace(/key=[^&\s]+/g, 'key=[redacted]') }); });
  await page.goto('/XingZhi');
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
  const first = await send(page, '规划杭州明天到后天的旅游路线');
  expect(first.command).toBe('clarify');
  const routeResponse = page.waitForResponse(r => r.url().endsWith('/tourism-planner') && r.request().method() === 'POST', { timeout: 100_000 });
  const second = await send(page, '七个大学生');
  expect(second.intake.known.audienceDescription).toBe('大学生');
  const route = await (await routeResponse).json();
  await evidence('live-tourism-route', route);
  expect(route.stops.length).toBeGreaterThan(0);
  expect(route.scheduleVersion).toBe(2);
  expect(route.stops.every(s => [day(1), day(2)].includes(s.date) && s.time < s.endTime)).toBe(true);
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled({ timeout: 100_000 });
  await page.getByRole('navigation', { name: '工作区导航' }).getByRole('button', { name: '执行方案', exact: true }).click();
  await page.getByRole('tab').filter({ hasText: '行程方案' }).click();
  await expect(page.getByRole('article').filter({ has: page.getByRole('heading', { name: /旅行规划书/ }) })).toContainText('大学生');
  for (const [name, suffix] of [['下载 Markdown', '.md'], ['下载 Word', '.docx']]) {
    const pending = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByRole('button', { name, exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toMatch(new RegExp(suffix.replace('.', '\\.') + '$'));
    expect(await download.failure()).toBeNull();
    const buffer = await (await import('node:fs/promises')).readFile(await download.path());
    expect(buffer.length).toBeGreaterThan(500);
    if (suffix === '.md') {
      const text = buffer.toString('utf8');
      expect(text).toContain('大学生');
      expect(text).toContain(day(1));
      expect(text).not.toMatch(/sk-[A-Za-z0-9]{10,}/);
      await evidence('markdown-export-check', { bytes: buffer.length, includesAudience: true, includesDate: true });
    } else {
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
      await evidence('word-export-check', { bytes: buffer.length, zipSignature: 'PK', note: 'download/container validation only; visual DOCX layout not checked' });
    }
  }
  await capture(page, 'plan-desktop');
  await page.getByRole('tab').filter({ hasText: '数据与证据' }).click();
  await capture(page, 'evidence-desktop');
  await page.getByRole('tab').filter({ hasText: 'Agent 轨迹' }).click();
  await expect(page.getByRole('tabpanel')).toContainText(/工具|执行|排程/);
  await page.getByRole('navigation', { name: '工作区导航' }).getByRole('button', { name: '环境地图', exact: true }).click();
  await expect(page.getByRole('heading', { name: /杭州市当前环境空间图/ })).toBeVisible();
  await expect(page.locator('.amap-logo')).toBeVisible({ timeout: 40_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'map-mobile');
  await evidence('browser-diagnostics', { runtimeErrors, warnings });
  expect(runtimeErrors).toEqual([]);
});

test('UI-039 hourly data outage displays an error and clears stale data', async ({ page }) => {
  await page.goto('/hourly');
  await expect(page.locator('.hour-table tbody tr')).toHaveCount(24);
  await page.route('**/api/v1/cities/hourly?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'QA simulated environment service outage' }) }));
  await page.getByLabel('选择日期', { exact: true }).fill(day(1));
  await expect(page.getByRole('alert').filter({ hasText: 'QA simulated' })).toBeVisible();
  await expect(page.locator('.hour-table tbody tr')).toHaveCount(0);
  await capture(page, 'simulated-hourly-outage');
});

test('UI-040 simulated geolocation and IP fallback failures produce an actionable message', async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_ok, fail) => fail({ code: 1, message: 'QA simulated permission denial' }); });
  await page.route('https://api.bigdatacloud.net/**', route => route.abort('failed'));
  await page.goto('/XingZhi');
  await page.getByRole('button', { name: '自动定位当前城市' }).click();
  await expect(page.locator('body')).toContainText(/定位失败|定位权限|允许定位|无法.*定位|拒绝/);
});

test('UI-041 no serious console animation warnings on fresh workspace', async ({ page }) => {
  const messages = [];
  page.on('console', m => { if (m.type() === 'warning' && /Invalid scope|GSAP target .*not found/.test(m.text())) messages.push(m.text()); });
  await page.goto('/XingZhi');
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
  await evidence('animation-warnings', messages);
  expect(messages).toEqual([]);
});

async function generateTourism(page) {
  await page.goto('/XingZhi');
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
  const pending = page.waitForResponse(r => r.url().endsWith('/tourism-planner') && r.request().method() === 'POST', { timeout: 100_000 });
  await send(page, '规划杭州明天到后天的旅游路线，七个大学生');
  const route = await (await pending).json();
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled({ timeout: 100_000 });
  return route;
}
const nav = (page, name) => page.getByRole('navigation', { name: '工作区导航' }).getByRole('button', { name, exact: true });

test('UI-042 itinerary does not schedule the same restaurant twice under aliases', async ({ page }) => {
  const route = await generateTourism(page);
  const pairs = [];
  for (let i = 0; i < route.stops.length; i++) for (let j = i + 1; j < route.stops.length; j++) {
    const a = route.stops[i], b = route.stops[j];
    const brand = name => name.split(/[（(]/)[0];
    if (brand(a.name).length >= 2 && brand(a.name) === brand(b.name) && Math.abs(a.longitude - b.longitude) < 0.0001 && Math.abs(a.latitude - b.latitude) < 0.0001) pairs.push({ a, b });
  }
  await evidence('duplicate-place-aliases', { pairs, routeSummary: route.summary });
  expect(pairs).toEqual([]);
});

test('UI-043 removing a stop updates the document and preserves a previous version', async ({ page }) => {
  const route = await generateTourism(page);
  await nav(page, '执行方案').click();
  await page.getByRole('tab').filter({ hasText: '行程方案' }).click();
  await page.getByText('调整地点与查看排程约束', { exact: true }).click();
  const edit = page.locator('.route-edit-panel');
  await expect(edit.getByRole('button', { name: '移除此地点并重新排程' })).toHaveCount(route.stops.length);
  const removedName = route.stops[0].name;
  await edit.getByRole('button', { name: '移除此地点并重新排程' }).first().click();
  await expect(edit.getByRole('button', { name: '移除此地点并重新排程' })).toHaveCount(route.stops.length - 1);
  await expect(page.locator('.planning-manuscript').getByRole('heading', { name: removedName, exact: true })).toHaveCount(0);
  await nav(page, '活动档案').click();
  await expect(page.getByRole('button', { name: '载入此方案' }).first()).toBeVisible();
  await page.getByRole('button', { name: '载入此方案' }).first().click();
  await page.getByText('调整地点与查看排程约束', { exact: true }).click();
  await expect(page.locator('.route-edit-panel').getByRole('button', { name: '移除此地点并重新排程' })).toHaveCount(route.stops.length);
  await capture(page, 'restored-plan-version');
});

test('UI-044 library create, mark verified, reload and delete only the QA material', async ({ page }) => {
  await page.goto('/XingZhi');
  await expect(page.getByRole('button', { name: '新建对话' })).toBeEnabled();
  await nav(page, '资料收藏').click();
  await page.getByLabel('资料标题', { exact: true }).fill('QA public official source');
  await page.getByLabel('原文链接', { exact: true }).fill('https://www.hangzhou.gov.cn/');
  await page.getByLabel('用途与待确认事项').fill('QA test note; not an approved reservation');
  await page.getByRole('button', { name: '保存资料', exact: true }).click();
  const card = page.locator('.material-card').filter({ hasText: 'QA public official source' });
  await expect(card).toBeVisible();
  await card.getByLabel('核对状态').selectOption('已人工核对');
  // Switching conversations flushes the application's autosave queue before reload.
  await page.getByRole('button', { name: '新建对话' }).click();
  await page.locator('[aria-label="历史对话"] button').last().click();
  await nav(page, '资料收藏').click();
  await page.reload();
  await expect(card.getByLabel('核对状态')).toHaveValue('已人工核对');
  await card.getByRole('button', { name: '删除资料' }).click();
  await expect(card).toHaveCount(0);
});

test('UI-045 organizer detects resource collisions and persists decimal expenses', async ({ page }) => {
  await generateTourism(page);
  await nav(page, '执行管理').click();
  for (const title of ['QA event A', 'QA event B']) {
    await page.getByLabel('项目/任务', { exact: true }).fill(title);
    await page.getByLabel('日期', { exact: true }).fill(day(1));
    await page.getByLabel('开始', { exact: true }).fill('09:00');
    await page.getByLabel('结束', { exact: true }).fill('10:00');
    await page.getByLabel('场地', { exact: true }).fill('QA shared venue');
    await page.getByLabel('负责人/裁判', { exact: true }).fill('QA-owner-01');
    await page.getByRole('button', { name: '添加并检查' }).click();
  }
  await expect(page.locator('.constraint-warning').filter({ hasText: /QA event A.*QA event B|QA event B.*QA event A/ }).first()).toBeVisible();
  await page.getByLabel('费用项目', { exact: true }).fill('QA expense');
  await page.getByLabel('数量', { exact: true }).fill('7');
  await page.getByLabel('单价（元）', { exact: true }).fill('12.34');
  await page.getByRole('button', { name: '记录费用' }).click();
  await expect(page.locator('body')).toContainText('¥86.38');
  await capture(page, 'organizer-collision-budget');
  await page.getByRole('button', { name: '新建对话' }).click();
  await page.locator('[aria-label="历史对话"] button').filter({ hasText: '规划杭州' }).click();
  await nav(page, '执行管理').click();
  await page.reload();
  await expect(page.locator('body')).toContainText('¥86.38');
  await expect(page.locator('.execution-list article')).toHaveCount(2);
});

test('UI-046 organizer flags an event whose end precedes its start', async ({ page }) => {
  await generateTourism(page);
  await nav(page, '执行管理').click();
  await page.getByLabel('项目/任务', { exact: true }).fill('QA reversed event');
  await page.getByLabel('开始', { exact: true }).fill('15:00');
  await page.getByLabel('结束', { exact: true }).fill('14:00');
  await page.getByRole('button', { name: '添加并检查' }).click();
  await capture(page, 'invalid-event-time');
  await expect(page.locator('.constraint-warning').filter({ hasText: 'QA reversed event：日期或起止时间无效' })).toBeVisible();
});

test('UI-047 hourly date uses Beijing calendar in a non-China browser timezone', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, timezoneId: 'America/Los_Angeles', locale: 'zh-CN' });
  try {
    const page = await context.newPage();
    // Synthetic client clock: same Beijing date as execution, shortly after midnight.
    await page.clock.install({ time: new Date(`${today()}T00:30:00+08:00`) });
    await page.goto('/hourly');
    const date = page.getByLabel('选择日期', { exact: true });
    await expect(date).not.toHaveValue('');
    await evidence('hourly-timezone', { syntheticClientInstant: `${today()}T00:30:00+08:00`, browserTimezone: 'America/Los_Angeles', expectedBeijingDate: today(), actualDate: await date.inputValue(), min: await date.getAttribute('min'), max: await date.getAttribute('max') });
    await capture(page, 'hourly-non-china-timezone');
    await expect(date).toHaveValue(today());
  } finally { await context.close(); }
});
