import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import Module from 'node:module';
const file='shared/guard-update-recovery.ts';
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const loaded=new Module(file);loaded._compile(compiled,file);
const {familyBetaRecoveryManifest}=loaded.exports;
const version='1.2.286';
const body={purpose:'bodeeguard-cloud-child-test-update',channel:'beta',version,product:'com.vexonastudios.bodeeguard.cloudchild',platform:'win32',arch:'x64'};
const make=(override={},extra={})=>Buffer.from(JSON.stringify({schemaVersion:3,payload:Buffer.from(JSON.stringify({...body,...override})).toString('base64'),signature:'synthetic-signature',...extra}));
test('backup feed returns exact published bytes without upstream or account access',()=>{
  const bytes=make();assert.deepEqual(familyBetaRecoveryManifest(bytes.toString('base64'),version),bytes);
});
test('backup feed cannot mix versions, customer channels, products or oversized input',()=>{
  for(const override of [{version:'1.2.285'},{channel:'stable'},{purpose:'bodeeguard-cloud-child-update'},{product:'legacy'},{platform:'darwin'}])
    assert.equal(familyBetaRecoveryManifest(make(override).toString('base64'),version),null);
  assert.equal(familyBetaRecoveryManifest(make({}, {unsigned:'extra'}).toString('base64'),version),null);
  for(const encoded of [undefined,'invalid',Buffer.from('not json').toString('base64'),'A'.repeat(50000)]) assert.equal(familyBetaRecoveryManifest(encoded,version),null);
});
