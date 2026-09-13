import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const outputs = ['public/guard-parent-version.json', 'app/guard/dashboard/generated/parent-version.json'];
// Only shipped source/assets: never include environment files or family data.
export function parentVersion(root) {
  const files = [];
  function visit(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute) || outputs.includes(relative)) return;
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(`${relative}/${name}`);
    } else files.push(relative);
  }
  for (const directory of ['app', 'components', 'shared', 'public/guard-admin']) visit(directory);
  for (const name of fs.readdirSync(path.join(root, 'public')).sort()) {
    if (name.startsWith('guard-') && name !== 'guard-admin') visit(`public/${name}`);
  }
  for (const file of ['next.config.ts', 'proxy.ts', 'package.json', 'package-lock.json', 'scripts/build-guard-parent-version.mjs']) visit(file);
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    let data = fs.readFileSync(path.join(root, file));
    // Windows checkouts and Linux builds must identify the same source.
    if (/\.(?:[cm]?[jt]sx?|css|json|html|svg|webmanifest)$/.test(file)) data = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
    hash.update(file + '\0').update(String(data.length) + '\0').update(data);
  }
  return { version: hash.digest('hex') };
}
export function writeParentVersion(root) {
  const value = parentVersion(root), text = JSON.stringify(value) + '\n';
  for (const output of outputs) {
    const filename = path.join(root, output);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== text) fs.writeFileSync(filename, text);
  }
  return value;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  console.log(`Parent app version: ${writeParentVersion(root).version.slice(0, 12)}`);
}
