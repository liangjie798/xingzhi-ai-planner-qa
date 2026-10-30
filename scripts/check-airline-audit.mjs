import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('reports/airlines-20261030');
const audit = JSON.parse(fs.readFileSync(path.join(root, 'results.json'), 'utf8'));
assert.equal(audit.results.length, 65);
assert.equal(new Set(audit.results.map(row => row.index)).size, 65);
assert.equal(Object.values(audit.counts).reduce((sum, value) => sum + value, 0), 65);
const observed = audit.results.filter(row => row.quoteVerified);
assert.equal(observed.length, audit.counts['quote-observed']);
for (const row of audit.results) {
  assert.equal(row.quoteVerified, row.status === 'quote-observed');
  if (row.evidence) assert.ok(fs.existsSync(path.join(root, row.evidence)), row.name);
  if (!row.quoteVerified) continue;
  assert.ok(Number.isFinite(row.displayPriceCny) && row.displayPriceCny > 0, row.name);
  assert.match(row.departureDate, /^2026-\d{2}-\d{2}$/);
  const evidence = fs.readFileSync(path.join(root, row.evidence), 'utf8').replace(/\\n|\s/g, '');
  assert.ok(evidence.includes(row.exampleFlight.split(' / ')[0]), `${row.name}: missing flight`);
  const numericText = evidence.replaceAll(',', '');
  assert.ok(numericText.includes(String(row.displayPriceCny)), `${row.name}: missing displayed amount`);
}
for (const name of fs.readdirSync(path.join(root, 'evidence'))) {
  const text = fs.readFileSync(path.join(root, 'evidence', name), 'utf8');
  assert.doesNotMatch(text, /ark-trace-(?:id|baggage)=|telassaSessionId(?:=|%3D)[A-Za-z0-9]{10,}|;jsessionid=[A-Za-z0-9]{12,}/i, name);
}
console.log(JSON.stringify({ registryRows: 65, reviewedQuotes: observed.length, evidenceConsistent: true }));
