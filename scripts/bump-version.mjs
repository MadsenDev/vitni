import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mode = process.argv[2];

if (!['major', 'minor', 'patch'].includes(mode)) {
  console.error('Usage: node scripts/bump-version.mjs <major|minor|patch>');
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function bump(version, kind) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }
  let [major, minor, patch] = match.slice(1).map((part) => Number.parseInt(part, 10));
  if (kind === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (kind === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const packageJsonPath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');
const sampleManifestPath = path.join(root, 'samples', 'operation-glass-harbor.vitni', 'manifest.json');

const packageJson = readJson(packageJsonPath);
const nextVersion = bump(packageJson.version, mode);
packageJson.version = nextVersion;
writeJson(packageJsonPath, packageJson);

if (fs.existsSync(packageLockPath)) {
  const packageLock = readJson(packageLockPath);
  packageLock.version = nextVersion;
  if (packageLock.packages?.['']) {
    packageLock.packages[''].version = nextVersion;
  }
  writeJson(packageLockPath, packageLock);
}

if (fs.existsSync(sampleManifestPath)) {
  const sampleManifest = readJson(sampleManifestPath);
  sampleManifest.app_version = nextVersion;
  writeJson(sampleManifestPath, sampleManifest);
}

console.log(nextVersion);
