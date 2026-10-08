import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyAnalysisPackage, verifyManifestFiles} from '../tools/verify-analysis-package.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'tether-analyzer-package-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(join(root, 'frozen'));
  const bytes = Buffer.from('{"synthetic":true}\n');
  writeFileSync(join(root, 'frozen', 'data.json'), bytes);
  return {root, files: [{path: 'frozen/data.json', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')}]};
}

test('synthetic package files verify without executing analyzer code', t => {
  const {root, files} = fixture(t);
  assert.equal(verifyManifestFiles(root, files), 1);
});
test('missing pinned analyzer data fails with materialization instructions', t => {
  const {root} = fixture(t);
  assert.throws(() => verifyAnalysisPackage(root), /Missing analyzer package data: SOURCE-MANIFEST.json.*ANALYSIS-PACKAGE.md/);
  assert.throws(() => verifyAnalysisPackage(), /not bundled.*ANALYSIS-PACKAGE.md/);
});
test('rewritten manifest cannot substitute a different package', t => {
  const {root, files} = fixture(t);
  writeFileSync(join(root, 'SOURCE-MANIFEST.json'), JSON.stringify({files}));
  assert.throws(() => verifyAnalysisPackage(root), /manifest.*hash mismatch/i);
});
test('changed or absent required package member fails closed', t => {
  const {root, files} = fixture(t);
  writeFileSync(join(root, 'frozen', 'data.json'), 'changed');
  assert.throws(() => verifyManifestFiles(root, files), /hash\/size mismatch/);
  rmSync(join(root, 'frozen', 'data.json'));
  assert.throws(() => verifyManifestFiles(root, files), /Missing analyzer package data: frozen\/data.json/);
});
test('duplicate, traversing and symlink package paths are rejected', t => {
  const {root, files} = fixture(t);
  assert.throws(() => verifyManifestFiles(root, [...files, ...files]), /duplicate/);
  assert.throws(() => verifyManifestFiles(root, [{...files[0], path: '../data.json'}]), /Invalid package member path/);
  symlinkSync(join(root, 'frozen'), join(root, 'alias'));
  assert.throws(() => verifyManifestFiles(root, [{...files[0], path: 'alias/data.json'}]), /symlink/);
});
test('CLI missing-data error is nonzero and does not start analysis', () => {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/verify-analysis-package.mjs', import.meta.url))], {encoding: 'utf8'});
  assert.equal(run.status, 1);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /not bundled.*ANALYSIS-PACKAGE.md/);
});
