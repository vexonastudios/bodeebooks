import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
// Load real component dependencies in isolated SSR tests, without installing
// global require hooks or treating a moved TSX component as missing at runtime.
export function loadTsModule(filename, override, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const component = new Module(filename); component.filename = filename; cache.set(filename, component);
  const localRequire = createRequire(filename);
  component.require = name => {
    const replacement = override(name); if (replacement !== undefined) return replacement;
    if (name.startsWith('.')) for (const suffix of ['.ts', '.tsx']) {
      const candidate = path.resolve(path.dirname(filename), name + suffix);
      if (fs.existsSync(candidate)) return loadTsModule(candidate, override, cache);
    }
    return localRequire(name);
  };
  component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return component.exports;
}
