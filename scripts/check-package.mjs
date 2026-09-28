import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const directory = mkdtempSync(join(tmpdir(), 'plabs-sdk-check-'));
try {
  writeFileSync(join(directory, 'package.json'), '{"private":true,"type":"module"}');
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', resolve(`${pkg.name}-${pkg.version}.tgz`)], { cwd: directory, stdio: 'inherit' });
  writeFileSync(join(directory, 'check.mjs'), `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import * as esm from 'plabs-js-sdk';
    const require = createRequire(import.meta.url);
    for (const entry of ['plabs-js-sdk', 'plabs-js-sdk/chains/evm', 'plabs-js-sdk/chains/privacy']) {
      assert.deepEqual(Object.keys(await import(entry)).sort(), Object.keys(require(entry)).sort());
    }
    assert.equal(require('plabs-js-sdk/package.json').version, ${JSON.stringify(pkg.version)});
    assert.equal(esm.getPlabsWallet(), null); // SSR must not access window at import time.
    const calls = [];
    const provider = { request: async request => { calls.push(request); return {}; }, on() {}, removeListener() {} };
    await esm.createPlabsWallet(provider).connect({ privacyScopes: ['address', 'balances', 'address'] });
    assert.deepEqual(calls, [{ method: 'plabs_connect', params: [{ scopes: ['address', 'balances'] }] }]);
    console.log('Packed SDK: ESM/CJS entry points, SSR and combined consent passed');
  `);
  execFileSync(process.execPath, ['check.mjs'], { cwd: directory, stdio: 'inherit' });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
