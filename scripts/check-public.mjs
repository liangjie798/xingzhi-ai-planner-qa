import fs from 'node:fs';
import path from 'node:path';
const excluded = new Set(['node_modules', '.git', 'test-results', 'playwright-report', 'private']);
const violations = [];
let count = 0;
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) { if (!excluded.has(e.name)) scan(file); continue; }
    if (/^\.env(?:\.|$)/.test(e.name) && e.name !== '.env.example') violations.push({ file, reason: 'environment file' });
    if (/\.har$|\.zip$|\.trace$|storage-state\.json$/.test(e.name)) violations.push({ file, reason: 'raw browser or archive artifact' });
    if (!/\.(?:mjs|json|md|html|ya?ml|log|txt)$/.test(e.name)) continue;
    count++;
    const text = fs.readFileSync(file, 'utf8');
    const patterns = [
      ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
      ['private key', /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],
      ['live session cookie', /(?:JSESSIONID|XSRF-TOKEN)=[A-Za-z0-9%._-]{16,}/],
      ['bearer credential', /Bearer\s+[A-Za-z0-9_.-]{24,}/],
      ['model key', /\bsk-[A-Za-z0-9_-]{24,}/]
    ];
    for (const [reason, regex] of patterns) if (regex.test(text)) violations.push({ file, reason });
  }
}
scan('.');
console.log(JSON.stringify({ checkedTextFiles: count, findings: violations }, null, 2));
if (violations.length) process.exitCode = 1;
