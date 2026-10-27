import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.SOURCE_DIR || '../amap-jsapi');
if (!fs.existsSync(path.join(root, 'frontend/package.json'))) throw new Error('Set SOURCE_DIR to the application repository.');
const startedAt = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const remoteHead = spawnSync('git', ['ls-remote', 'origin', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim().split(/\s/)[0];
fs.mkdirSync('reports/source', { recursive: true });
const checks = [
  ['frontend-lint', 'npm', ['run', 'lint'], 'frontend'],
  ['frontend-tests', 'node', ['--experimental-strip-types', '--test', ...fs.readdirSync(path.join(root, 'frontend/tests')).filter(f => f.endsWith('.test.mjs')).map(f => `tests/${f}`)], 'frontend'],
  ['frontend-build', 'npm', ['run', 'build'], 'frontend'],
  ['backend-tests', process.platform === 'win32' ? 'mvnw.cmd' : 'bash', process.platform === 'win32' ? ['--batch-mode', 'test'] : ['./mvnw', '--batch-mode', 'test'], 'backend'],
  ['publish-history', 'node', ['scripts/check-publish.mjs'], '.']
];
const results = [];
for (const [id, command, args, dir] of checks) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd: path.join(root, dir), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 600_000, shell: process.platform === 'win32' && /npm|\.cmd$/.test(command) });
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? '\n' + result.error.message : ''}`.replace(/\u001b\[[0-9;]*m/g, '').replaceAll(root, '<SOURCE_DIR>').replaceAll(root.replaceAll('\\', '/'), '<SOURCE_DIR>').replaceAll(process.env.USERPROFILE || '/nonexistent', '<USERPROFILE>');
  fs.writeFileSync(`reports/source/${id}.log`, output);
  const item = { id, command: [command, ...args].join(' '), directory: dir, exitCode: result.status, signal: result.signal, durationMs: Date.now() - started };
  results.push(item);
  console.log(JSON.stringify(item));
}
fs.writeFileSync('reports/source-checks.json', JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), sourceRepository: 'https://github.com/liangjie798/xingzhi-ai-planner', revision, remoteHead, liveDeploymentRevision: 'not exposed by site; local source commit is NOT proof of production build identity', java: spawnSync('java', ['-version'], { encoding: 'utf8' }).stderr.trim(), results }, null, 2) + '\n');
if (results.some(r => r.exitCode !== 0)) process.exitCode = 1;
