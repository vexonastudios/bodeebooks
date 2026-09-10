import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Browser-only, pinned PDF.js assets. No PDFs are sent to a rendering service.
const source = resolve('node_modules/pdfjs-dist');
const target = resolve('public/guard-admin/vendor/pdfjs');
const version = JSON.parse(readFileSync(`${source}/package.json`)).version;
if (version !== '6.3.289') throw Error('Review the PDF.js upgrade before exporting.');
mkdirSync(target, { recursive: true });
for (const [from, to] of [['build/pdf.mjs', 'pdf.mjs'], ['build/pdf.worker.mjs', 'pdf.worker.mjs'], ['LICENSE', 'LICENSE']]) copyFileSync(`${source}/${from}`, `${target}/${to}`);
for (const folder of ['standard_fonts', 'cmaps', 'wasm']) {
  mkdirSync(`${target}/${folder}`, { recursive: true });
  for (const name of readdirSync(`${source}/${folder}`)) copyFileSync(`${source}/${folder}/${name}`, `${target}/${folder}/${name}`);
}
writeFileSync(`${target}/VERSION`, `${version}\nhttps://github.com/mozilla/pdf.js\nApache-2.0\n`);
console.log(`Exported PDF.js ${version}.`);
