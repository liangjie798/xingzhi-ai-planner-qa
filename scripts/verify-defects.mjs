import fs from 'node:fs/promises';
import { chromium, request } from '@playwright/test';
const baseURL = process.env.BASE_URL || 'https://lht574.cn';
await fs.mkdir('reports/evidence', { recursive: true });
const api = await request.newContext({ baseURL });
const examples = [];
for (const [path, payload] of [['/conversation-planner', null], ['/model-gateway', { prompt: 123 }]]) {
  const r = await api.post(path, { data: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
  examples.push({ method: 'POST', path, input: payload, status: r.status(), contentType: r.headers()['content-type'], body: (await r.text()).slice(0, 300) });
}
for (const path of ['/api/v1/cities/hourly?cityId=hangzhou&date=2026-02-30', '/location-gateway?action=reverse', '/location-gateway?action=reverse&longitude=999&latitude=999']) {
  const r = await api.get(path);
  examples.push({ method: 'GET', path, status: r.status(), contentType: r.headers()['content-type'], body: (await r.text()).slice(0, 500) });
}
await fs.writeFile('reports/evidence/boundary-reproduction.json', JSON.stringify({ at: new Date().toISOString(), examples }, null, 2) + '\n');
await api.dispose();
const browser = await chromium.launch({ ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) });
const observations = [];
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    try {
      const page = await context.newPage();
      await page.goto('/dashboard?view=archive');
      await page.getByRole('button', { name: '新建对话' }).waitFor({ state: 'visible' });
      // Wait for the asynchronous snapshot restore, not just the URL redirect.
      await page.getByRole('button', { name: '新建对话' }).evaluate(async b => { const start = performance.now(); while (b.disabled && performance.now() - start < 20_000) await new Promise(resolve => setTimeout(resolve, 50)); });
      const actual = await page.locator('.workspace-context strong').innerText();
      observations.push({ attempt: i + 1, url: page.url(), expected: '活动档案', actual });
      if (actual !== '活动档案') await page.screenshot({ path: 'reports/screenshots/legacy-deep-link.png' });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
await fs.writeFile('reports/evidence/legacy-link-probes.json', JSON.stringify({ at: new Date().toISOString(), observations }, null, 2) + '\n');
console.log(JSON.stringify({ boundaryExamples: examples.map(x => ({ path: x.path, status: x.status })), deepLinks: observations }));
