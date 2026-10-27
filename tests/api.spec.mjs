import { test, expect } from '@playwright/test';
import { today, day, knownPlan, json, conversation, csrf, evidence } from './helpers.mjs';

const invalidJsonRoutes = ['/conversation-planner', '/tourism-planner', '/planning-evidence', '/activity-venues', '/journey-search', '/model-gateway', '/social-research'];
for (const [i, route] of invalidJsonRoutes.entries()) {
  test(`API-${String(i + 1).padStart(3, '0')} ${route} rejects malformed JSON`, async ({ request }) => {
    const r = await request.post(route, { data: '{', headers: { 'Content-Type': 'application/json' } });
    expect(r.status()).toBe(400);
    expect((await json(r)).detail).toBeTruthy();
  });
  test(`API-${String(i + 11).padStart(3, '0')} ${route} rejects JSON null without a server error`, async ({ request }) => {
    const r = await request.post(route, { data: 'null', headers: { 'Content-Type': 'application/json' } });
    expect(r.status()).toBe(400);
    expect((await json(r)).detail).toBeTruthy();
  });
}

const badInputs = [
  ['/conversation-planner', {}, 'missing message'],
  ['/conversation-planner', { message: '   ' }, 'blank message'],
  ['/conversation-planner', { message: 123 }, 'numeric message'],
  ['/model-gateway', {}, 'missing prompt'],
  ['/model-gateway', { prompt: 123 }, 'numeric prompt'],
  ['/model-gateway', { prompt: 'x'.repeat(12001) }, 'overlong prompt', 413],
  ['/model-gateway', { prompt: 'QA', imageDataUrl: 'https://example.com/image.png' }, 'unsupported image', 413],
  ['/model-gateway', { prompt: 'QA', imageDataUrl: { bad: true } }, 'non-string image', 413],
  ['/tourism-planner', {}, 'missing city and date'],
  ['/tourism-planner', { cityName: '杭州市', date: '2026-02-30', hours: [] }, 'nonexistent calendar date'],
  ['/tourism-planner', { cityName: '杭州市', date: day(2), endDate: day(1), hours: [] }, 'reversed date range'],
  ['/tourism-planner', { cityName: '杭州市', date: day(1), endDate: day(8), hours: [] }, 'eight-day range'],
  ['/tourism-planner', { cityName: '杭州市', date: day(1), hours: [null] }, 'null hourly entry'],
  ['/tourism-planner', { cityName: '杭州市', date: day(1), hours: {} }, 'non-array hours'],
  ['/tourism-planner', { cityName: '杭州市', date: day(1), hours: [], allowedStartHour: 16, allowedEndHour: 14 }, 'reversed allowed hours'],
  ['/planning-evidence', { city: '杭州', places: [null] }, 'non-string place'],
  ['/planning-evidence', { city: '杭州', places: Array(41).fill('西湖') }, 'more than 40 places'],
  ['/activity-venues', { input: { activityType: '不存在的活动' } }, 'unsupported scene'],
  ['/journey-search', { origin: 42, destination: '北京', date: day(1) }, 'numeric departure'],
  ['/journey-search', {}, 'missing journey fields']
];
for (const [i, [route, data, label, status = 400]] of badInputs.entries()) {
  test(`API-${String(31 + i).padStart(3, '0')} ${route}: ${label}`, async ({ request }) => {
    const r = await request.post(route, { data });
    expect(r.status()).toBe(status);
    expect((await json(r)).detail).toBeTruthy();
  });
}

for (const [i, url] of ['', '?url=http://example.com/a.png', '?url=https://example.com/a.png', '?url=https://amap.com.example.com/a.png', '?url=file:///etc/passwd', '?url=https://user:password@amap.com/a.png'].entries()) {
  test(`API-${String(61 + i).padStart(3, '0')} image proxy rejects unsupported URL ${i}`, async ({ request }) => {
    expect((await request.get('/plan-media' + url)).status()).toBe(400);
  });
}

test('API-070 complete tourism intake preserves seven university students', async ({ request }) => {
  const first = await conversation(request, '规划杭州明天到后天的旅游路线');
  expect(first.command).toBe('clarify');
  const second = await conversation(request, '七个大学生', { intake: first.intake, activeTopic: 'planning' });
  await evidence('tourism-intake', { first, second });
  expect(second.command).toBe('analyze');
  expect(second.intake.known).toMatchObject({ participants: 7, audienceDescription: '大学生', date: day(1), endDate: day(2) });
});

const revisions = [
  ['人数改成0人，其他不变', /人数必须/],
  ['人数改成-1人', /人数必须/],
  ['人数改成1.5人', /人数必须/],
  ['人数改成10000人', /人数必须/],
  ['活动时长改成1.5小时，其他不变', /90分钟|整小时/],
  ['活动时长改成0小时', /1至8|整小时/],
  ['活动时长改成9小时', /1至8|整小时/],
  ['日期改成2月30日，其他不变', /没有|不存在|无效/]
];
for (const [i, [message, pattern]] of revisions.entries()) {
  test(`API-${String(71 + i).padStart(3, '0')} invalid revision: ${message}`, async ({ request }) => {
    const known = knownPlan();
    const b = await conversation(request, message, { intake: { known }, activeTopic: 'planning' });
    expect(b.command).toBe('answer');
    expect(b.intake.known).toEqual(known);
    expect(b.reply).toMatch(pattern);
  });
}

test('API-080 courtesy preserves conditions without another analysis', async ({ request }) => {
  const known = knownPlan();
  const b = await conversation(request, '谢谢！', { intake: { known }, activeTopic: 'planning' });
  expect(b.command).toBe('answer');
  expect(b.intake.known).toEqual(known);
});
test('API-081 drawing two dates does not change the activity plan', async ({ request }) => {
  const known = knownPlan();
  const b = await conversation(request, '把明天和后天的气温和降雨概率画成对比图', { intake: { known }, activeTopic: 'planning' });
  expect(b.command).toBe('answer');
  expect(b.intake.known).toEqual(known);
  expect(b.visualization).toMatchObject({ dates: [day(1), day(2)], metrics: ['temperature', 'rainProbability'] });
});
test('API-082 drawing Beijing preserves the Hangzhou plan', async ({ request }) => {
  const known = knownPlan();
  const b = await conversation(request, '改画北京的气温对比图，活动方案保持不变', { intake: { known }, activeTopic: 'planning', chartContext: { cityName: '杭州市', dates: [day(1), day(2)], metrics: ['temperature', 'rainProbability'] } });
  expect(b.intake.known).toEqual(known);
  expect(b.visualization.cityName).toBe('北京市');
});
test('API-083 explicit 14-16 window overrides a broad afternoon', async ({ request }) => {
  const b = await conversation(request, '活动改到明天下午14点到16点，时长2小时', { intake: { known: knownPlan() }, activeTopic: 'planning' });
  expect(b.intake.known).toMatchObject({ allowedStartHour: 14, allowedEndHour: 16, duration: 2 });
});
test('API-084 per-group count never replaces total participants', async ({ request }) => {
  const b = await conversation(request, '每组5人，器材10套', { intake: { known: knownPlan() }, activeTopic: 'planning' });
  expect(b.intake.known).toMatchObject({ participants: 40, teamSize: 5, equipmentCount: 10 });
});
test('API-085 model status reports explicit success or failure', async ({ request }) => {
  const b = await conversation(request, '你是什么模型？');
  expect(typeof b.modelCall.success).toBe('boolean');
  expect(b.modelCall.requestId).toBeTruthy();
  if (b.modelCall.success) expect(b.modelCall.model).toBeTruthy();
  else expect(b.reply).toMatch(/没有取得|未配置|调用失败|权限/);
  await evidence('model-status', { kind: b.kind, modelCall: { success: b.modelCall.success, model: b.modelCall.model }, reply: b.reply });
});
test('API-086 journey keeps activity date separate and reports quote availability', async ({ request }) => {
  const known = knownPlan();
  const b = await conversation(request, '明天从西安到北京怎么走便宜', { intake: { known }, activeTopic: 'planning' });
  expect(b.command).toBe('answer');
  expect(b.intake.known.date).toBe(known.date);
  expect(b.intake.known.cityName).toBe('杭州市');
  expect(b.intake.known.journeyDestination).toMatch(/北京/);
  expect(b.reply).toMatch(/票|未启用|未授权|查询|候选/);
  await evidence('journey-status', { kind: b.kind, intake: b.intake, reply: b.reply });
});
test('API-087 weather is answered without triggering plan generation', async ({ request }) => {
  const known = knownPlan();
  const b = await conversation(request, '明天西安的天气怎么样', { intake: { known }, activeTopic: 'planning' });
  expect(b.command).toBe('answer');
  expect(b.intake.known).toEqual(known);
  expect(b.activeTopic).toBe('weather');
  await evidence('weather-answer', b);
});
test('API-088 missing destination and date are clarified, not invented', async ({ request }) => {
  const b = await conversation(request, '帮我规划三天旅游');
  expect(b.command).toBe('clarify');
  expect(b.intake.known.cityName).toBeUndefined();
  expect(b.intake.known.date).toBeUndefined();
});
test('API-089 client-supplied today cannot alter the server date', async ({ request }) => {
  const b = await conversation(request, '规划杭州明天旅游，7个大学生', { today: '2000-01-01' });
  expect(b.intake.known.date).toBe(day(1));
});

for (const [i, path] of ['/api/v1/admin/overview', '/api/v1/admin/users', '/api/v1/admin/searches', '/api/v1/admin/feedback', '/api/v1/account/decisions', '/api/v1/account/model-config/resolve'].entries()) {
  test(`API-${String(100 + i).padStart(3, '0')} anonymous access denied: ${path}`, async ({ request }) => {
    const r = await request.get(path);
    expect([401, 403]).toContain(r.status());
  });
}
test('API-106 guest access to admin data is denied', async ({ request }) => {
  const headers = await csrf(request);
  const guest = await request.post('/api/v1/auth/guest', { headers });
  expect(guest.status()).toBe(200);
  expect((await guest.json()).role).toBe('GUEST');
  expect([401, 403]).toContain((await request.get('/api/v1/admin/users')).status());
});
test('API-107 writes without CSRF are rejected', async ({ request }) => {
  const r = await request.post('/api/v1/conversation-sessions', { data: { messages: [] } });
  expect(r.status()).toBe(403);
});
test('API-108 two isolated anonymous sessions cannot read or overwrite each other', async ({ playwright, baseURL }) => {
  const a = await playwright.request.newContext({ baseURL });
  const b = await playwright.request.newContext({ baseURL });
  let id;
  try {
    const body = { messages: [{ role: 'user', content: 'QA isolated session, safe to delete' }], intake: { known: knownPlan() } };
    const created = await a.post('/api/v1/conversation-sessions', { headers: await csrf(a), data: body });
    expect(created.status()).toBe(200);
    id = (await created.json()).id;
    expect((await a.get(`/api/v1/conversation-sessions/${id}`)).status()).toBe(200);
    expect((await b.get(`/api/v1/conversation-sessions/${id}`)).status()).toBe(404);
    expect((await b.put(`/api/v1/conversation-sessions/${id}`, { headers: await csrf(b), data: body })).status()).toBe(404);
    const updated = { ...body, messages: [...body.messages, { role: 'assistant', content: 'QA persistence check' }] };
    expect((await a.put(`/api/v1/conversation-sessions/${id}`, { headers: await csrf(a), data: updated })).status()).toBe(200);
    await expect((await a.get(`/api/v1/conversation-sessions/${id}`)).json()).resolves.toEqual(updated);
  } finally {
    if (id) await a.delete(`/api/v1/conversation-sessions/${id}`, { headers: await csrf(a) });
    await a.dispose(); await b.dispose();
  }
});
test('API-109 malformed conversation snapshot is rejected', async ({ request }) => {
  const r = await request.post('/api/v1/conversation-sessions', { headers: await csrf(request), data: { messages: 'wrong-type' } });
  expect(r.status()).toBe(400);
});
test('API-110 nested district resolves to the requested parent', async ({ request }) => {
  const r = await request.get('/location-gateway', { params: { action: 'search', q: '陕西省榆林市榆阳区' } });
  expect(r.status()).toBe(200);
  const b = await r.json();
  expect(b.length).toBeGreaterThan(0);
  expect(b.every(p => p.adcode === '610802')).toBe(true);
  await evidence('district-search', b);
});
test('API-111 hourly response contains 24 unique, finite hours for the requested date', async ({ request }) => {
  const r = await request.get('/api/v1/cities/hourly', { params: { cityId: 'hangzhou', date: day(1) } });
  expect(r.status()).toBe(200);
  const b = await r.json();
  expect(b.date).toBe(day(1));
  expect(b.hours).toHaveLength(24);
  expect(new Set(b.hours.map(h => h.hour)).size).toBe(24);
  expect(b.hours.every(h => [h.temperature, h.humidity, h.rainProbability, h.aqi, h.heatRisk].every(Number.isFinite))).toBe(true);
  await evidence('hourly-response', b);
});
test('API-112 invalid hourly calendar date returns a client error', async ({ request }) => {
  const r = await request.get('/api/v1/cities/hourly', { params: { cityId: 'hangzhou', date: '2026-02-30' } });
  expect(r.status()).toBe(400);
});
test('API-113 impossible coordinate is rejected by the location gateway', async ({ request }) => {
  const r = await request.get('/location-gateway', { params: { action: 'reverse', longitude: '999', latitude: '999' } });
  expect(r.status()).toBe(400);
});
test('API-114 missing coordinates are rejected instead of silently becoming zero', async ({ request }) => {
  const r = await request.get('/location-gateway', { params: { action: 'reverse' } });
  expect(r.status()).toBe(400);
});
test('API-115 unsupported position action returns a client error', async ({ request }) => {
  expect((await request.get('/location-gateway?action=unknown')).status()).toBe(400);
});
test('API-116 wrong HTTP method is rejected without a server crash', async ({ request }) => {
  expect((await request.get('/conversation-planner')).status()).toBe(405);
});

for (const [i, scene] of ['校园运动会', '体育课', '社区活动', '户外训练', '研学活动', '旅游规划'].entries()) {
  test(`API-${String(120 + i).padStart(3, '0')} scenario intake: ${scene}`, async ({ request }) => {
    const b = await conversation(request, scene === '旅游规划' ? '规划明天杭州一日旅游，40名大学生' : `规划明天杭州的${scene}，40名大学生，下午2小时，中强度`, { activeTopic: 'planning' });
    expect(b.intake.known.activityType).toBe(scene);
    expect(b.intake.known.participants).toBe(40);
    expect(b.intake.known.audienceDescription).toBe('大学生');
    expect(b.intake.known.date).toBe(day(1));
    expect(b.command).toBe('analyze');
  });
}
