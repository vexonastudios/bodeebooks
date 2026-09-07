import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

const filename = path.resolve('shared/guard-cloud-release.ts');
const module = new Module(filename);
module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
export const cloudReleaseModule = module.exports;

// Synthetic release data only: these versions are not published or approved.
export function cloudReleaseFixture(channel = 'stable', version = '1.2.300') {
  return { version, downloadUrl: `https://github.com/vexonastudios/bodeeguard-${channel}-releases/releases/download/cloud-child-v${version}/BodeeGuard-Cloud-Child-Setup-${version}.exe` };
}

export const legacyReleaseFixture = {
  version: '1.2.157',
  downloadUrl: 'https://github.com/vexonastudios/bodeeguard-stable-releases/releases/download/v1.2.157/BodeeGuard-Setup-1.2.157.exe',
};
