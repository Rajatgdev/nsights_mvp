// One-off: confirms BLOB_READ_WRITE_TOKEN works and uploads reach the store.
// Run: pnpm --filter @nsights/api exec tsx src/scripts/blob-test.ts
import './env';
import { putObject } from './lib/blob';

async function main() {
  const r = await putObject(`test/hello-${Date.now()}.txt`, Buffer.from('nSights blob test'), 'text/plain');
  console.log('[blob-test] uploaded OK →', r.url);
}
main().then(() => process.exit(0)).catch((e) => { console.error('[blob-test] FAILED:', e); process.exit(1); });