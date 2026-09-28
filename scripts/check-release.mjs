import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
assert.equal(pkg.name, 'plabs-js-sdk');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'Only stable release versions are supported');
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
assert.equal(lock.name, pkg.name);
if (process.env.GITHUB_REF_TYPE === 'tag') {
  assert.equal(process.env.GITHUB_REF_NAME, `v${pkg.version}`, 'Tag must match package version');
}
assert.ok(readFileSync('CHANGELOG.md', 'utf8').includes(`## ${pkg.version}\n`), 'Missing changelog entry');
console.log(`Validated ${pkg.name}@${pkg.version}`);
