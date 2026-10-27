import { expect } from '@playwright/test';
import fs from 'node:fs/promises';

export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
export const day = (offset) => {
  const d = new Date(`${today()}T00:00:00+08:00`);
  return new Date(d.getTime() + offset * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
};
export const knownPlan = () => ({ cityName: '杭州市', activityType: '校园运动会', date: day(1), endDate: day(2), participants: 40, group: '儿童青少年', duration: 2, intensity: '中强度', startHour: 14, allowedStartHour: 14, allowedEndHour: 16 });
export async function json(response) {
  const text = await response.text();
  expect(response.headers()['content-type'] || '', text.slice(0, 300)).toContain('application/json');
  return JSON.parse(text);
}
export async function conversation(request, message, extra = {}) {
  const response = await request.post('/conversation-planner', { data: { message, today: today(), ...extra } });
  expect(response.status()).toBe(200);
  return json(response);
}
export async function csrf(request) {
  const r = await request.get('/api/v1/auth/csrf');
  expect(r.status()).toBe(200);
  const body = await r.json();
  return { [body.headerName]: body.token };
}
export async function evidence(name, data) {
  await fs.mkdir('reports/evidence', { recursive: true });
  await fs.writeFile(`reports/evidence/${name}.json`, JSON.stringify(data, null, 2) + '\n');
}
export async function capture(page, name) {
  await fs.mkdir('reports/screenshots', { recursive: true });
  await page.screenshot({ path: `reports/screenshots/${name}.png`, fullPage: false, animations: 'disabled' });
}
export async function send(page, message) {
  const box = page.getByRole('textbox', { name: '问题或规划需求' });
  await box.fill(message);
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/conversation-planner') && r.request().method() === 'POST');
  await page.getByRole('button', { name: '发送分析要求' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return response.json();
}
