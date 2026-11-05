import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

const filename=path.resolve('shared/guard-customer-candidate.ts'),mod=new Module(filename);
mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
const {canDownloadCandidate,candidateDownloadUrl,candidatePath,releasedCustomerR2Url}=mod.exports;

test('candidate is restricted to the explicitly configured verified account',()=>{
 const old=process.env.BODEEGUARD_CUSTOMER_CANDIDATE_EMAIL;process.env.BODEEGUARD_CUSTOMER_CANDIDATE_EMAIL='owner@example.test';
 const user=(email,status)=>({primaryEmailAddress:{emailAddress:email,verification:{status}}});
 try{
  assert.equal(canDownloadCandidate(user('OWNER@example.test','verified')),true);
  assert.equal(canDownloadCandidate(user('other@example.test','verified')),false);
  assert.equal(canDownloadCandidate(user('owner@example.test','unverified')),false);
  assert.equal(canDownloadCandidate(null),false);
  delete process.env.BODEEGUARD_CUSTOMER_CANDIDATE_EMAIL;
  assert.equal(canDownloadCandidate(user('owner@example.test','verified')),false);
 }finally{if(old===undefined)delete process.env.BODEEGUARD_CUSTOMER_CANDIDATE_EMAIL;else process.env.BODEEGUARD_CUSTOMER_CANDIDATE_EMAIL=old;}
});

test('candidate URL is short-lived and signs only the fixed R2 path',()=>{
 const oldOrigin=process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN,oldSecret=process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET;
 process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN='https://assets.example.test/';process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET='synthetic-secret';
 try{
  const url=new URL(candidateDownloadUrl()),expires=url.searchParams.get('expires');
  assert.equal(url.pathname,candidatePath);assert.ok(Number(expires)-Date.now()/1000>295 && Number(expires)-Date.now()/1000<=300);
  assert.equal(url.searchParams.get('signature'),createHmac('sha256','synthetic-secret').update(['bodeeguard-installer-download-v1','GET',candidatePath,expires].join('\n')).digest('hex'));
  assert.equal(new URL(releasedCustomerR2Url('stable','1.2.339')).pathname,candidatePath);
  const current = new URL(releasedCustomerR2Url('stable','1.2.342'));
  assert.equal(current.pathname,'/v1/installers/candidates/30e46acfc133853d52dfeabd4bc4e07d/BodeeGuard-Cloud-Child-Setup-1.2.342.exe');
  assert.equal(current.searchParams.get('signature'),createHmac('sha256','synthetic-secret').update(['bodeeguard-installer-download-v1','GET',current.pathname,current.searchParams.get('expires')].join('\n')).digest('hex'));
  const next = new URL(releasedCustomerR2Url('stable','1.2.343'));
  assert.equal(next.pathname,'/v1/installers/candidates/ee996b495394d8c95dda11fcf1223d87/BodeeGuard-Cloud-Child-Setup-1.2.343.exe');
  assert.equal(next.searchParams.get('signature'),createHmac('sha256','synthetic-secret').update(['bodeeguard-installer-download-v1','GET',next.pathname,next.searchParams.get('expires')].join('\n')).digest('hex'));
  const repaired = new URL(releasedCustomerR2Url('stable','1.2.344'));
  assert.equal(repaired.pathname,'/v1/installers/candidates/f9d13fc1cbc1e3455e7988152bed7007/BodeeGuard-Cloud-Child-Setup-1.2.344.exe');
  assert.equal(repaired.searchParams.get('signature'),createHmac('sha256','synthetic-secret').update(['bodeeguard-installer-download-v1','GET',repaired.pathname,repaired.searchParams.get('expires')].join('\n')).digest('hex'));
  const setupRepair = new URL(releasedCustomerR2Url('stable','1.2.345'));
  assert.equal(setupRepair.pathname,'/v1/installers/candidates/7cd7022bc96f0a616a05af80c8e7cd68/BodeeGuard-Cloud-Child-Setup-1.2.345.exe');
  assert.equal(setupRepair.searchParams.get('signature'),createHmac('sha256','synthetic-secret').update(['bodeeguard-installer-download-v1','GET',setupRepair.pathname,setupRepair.searchParams.get('expires')].join('\n')).digest('hex'));
  const approvalRecovery = new URL(releasedCustomerR2Url('stable','1.2.346'));
  assert.equal(approvalRecovery.pathname,'/v1/installers/candidates/15708d54979ac5a30f0be9e598b45dfc/BodeeGuard-Cloud-Child-Setup-1.2.346.exe');
  assert.equal(approvalRecovery.searchParams.get('signature'),createHmac('sha256','synthetic-secret').update(['bodeeguard-installer-download-v1','GET',approvalRecovery.pathname,approvalRecovery.searchParams.get('expires')].join('\n')).digest('hex'));
  assert.equal(releasedCustomerR2Url('beta','1.2.345'),null);
  assert.equal(releasedCustomerR2Url('beta','1.2.344'),null);
  assert.equal(releasedCustomerR2Url('beta','1.2.343'),null);
  assert.equal(releasedCustomerR2Url('beta','1.2.342'),null);
  assert.equal(releasedCustomerR2Url('beta','1.2.339'),null);assert.equal(releasedCustomerR2Url('stable','1.2.340'),null);
  process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN='http://assets.example.test/';assert.equal(candidateDownloadUrl(),null);
 }finally{
  if(oldOrigin===undefined)delete process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN;else process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN=oldOrigin;
  if(oldSecret===undefined)delete process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET;else process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET=oldSecret;
 }
});
