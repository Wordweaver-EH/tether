// Test-only, offline comparison fixtures. Never substitute current code for a
// missing historical baseline, and never fetch or trust an environment override.
import {createHash} from 'node:crypto';
import {cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const compatibilityFixtureRoot = resolve(repoRoot, 'fixtures/compatibility');
export const compatibilityManifestSHA256 = 'a472381f7ae72defadbcf522a715badb91eb1c820e6f3a86fe390faa9d290597';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function verifyCompatibilityFixtures(root = compatibilityFixtureRoot) {
  const manifestBytes = readFileSync(resolve(root, 'manifest.json'));
  if (sha256(manifestBytes) !== compatibilityManifestSHA256)
    throw new Error('Compatibility fixture manifest hash mismatch');
  const manifest = JSON.parse(manifestBytes);
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (sha256(readFileSync(resolve(root, path))) !== expected)
      throw new Error(`Compatibility fixture hash mismatch: ${path}`);
  }
  const historical = manifest.historicalAffectTest;
  if (sha256(readFileSync(resolve(repoRoot, historical.path))) !== historical.sha256)
    throw new Error('Historical affect test hash mismatch');
  return manifest;
}

export async function loadFrozenRebuiltSMind() {
  verifyCompatibilityFixtures();
  return import(pathToFileURL(resolve(compatibilityFixtureRoot, 'rebuilt-s/src/mind/index.mjs')).href);
}

// Both arms use the current controller and all its current dependencies. Only
// the workspace bytes differ, so noAffect isolates the appraisal repair rather
// than demanding that later N/S/C1/C2 mechanisms reproduce original-v2 behavior.
export async function materializeCurrentMindWithOriginalWorkspace() {
  verifyCompatibilityFixtures();
  const path = mkdtempSync(resolve(tmpdir(), 'tether-workspace-parity-'));
  const cleanup = () => rmSync(path, {recursive: true, force: true});
  try {
    const currentMind = resolve(repoRoot, 'src/mind');
    cpSync(currentMind, resolve(path, 'mind'), {recursive: true});
    // The optional Cover visibility contract is a current shared dependency.
    // Copy it unchanged into both current-controller workspace-swap arms.
    const visibility = readFileSync(resolve(repoRoot, 'src/visibility.js'));
    writeFileSync(resolve(path, 'visibility.js'), visibility);
    writeFileSync(resolve(path, 'package.json'), '{"type":"module"}\n');
    if (!readFileSync(resolve(path, 'visibility.js')).equals(visibility))
      throw new Error('Current visibility dependency copy mismatch');
    const originalWorkspace = readFileSync(resolve(compatibilityFixtureRoot, 'original-v2/src/mind/workspace.mjs'));
    writeFileSync(resolve(path, 'mind/workspace.mjs'), originalWorkspace);
    for (const name of readdirSync(currentMind)) {
      const expected = name === 'workspace.mjs' ? originalWorkspace : readFileSync(resolve(currentMind, name));
      if (!readFileSync(resolve(path, 'mind', name)).equals(expected))
        throw new Error(`Current-module workspace-swap copy mismatch: ${name}`);
    }
    const module = await import(pathToFileURL(resolve(path, 'mind/index.mjs')).href);
    return {...module, path, cleanup};
  } catch (error) {
    cleanup();
    throw error;
  }
}
