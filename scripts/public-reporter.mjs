import fs from 'node:fs';
import path from 'node:path';

// Deliberately omit request/response headers, storage state and authentication data.
export default class PublicReporter {
  onBegin() { this.startedAt = new Date().toISOString(); this.rows = []; }
  onTestEnd(test, result) {
    this.rows.push({
      id: test.title.match(/^[A-Z]+-\d+/)?.[0] || test.title,
      title: test.title,
      file: path.relative(process.cwd(), test.location.file).replaceAll('\\', '/'),
      status: result.status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      annotations: test.annotations,
      errors: result.errors.map(e => (e.message || '').replace(/\u001b\[[0-9;]*m/g, '').replaceAll(process.cwd(), '.').slice(0, 5000))
    });
  }
  onEnd(result) {
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync('reports/execution.json', JSON.stringify({
      startedAt: this.startedAt, finishedAt: new Date().toISOString(),
      baseURL: process.env.BASE_URL || 'https://lht574.cn',
      scope: 'live black-box tests; synthetic inputs are explicitly labelled in cases',
      status: result.status,
      runtime: { node: process.version, platform: process.platform, timezone: 'Asia/Shanghai' },
      tests: this.rows
    }, null, 2) + '\n');
  }
}
