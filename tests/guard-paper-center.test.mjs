import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newAssignmentDates } from '../public/guard-admin/cloud-spelling.js';

test('new schoolwork defaults begin today and schedule review seven days later', () => {
  assert.deepEqual(newAssignmentDates('2026-09-19'), { startDate: '2026-09-19', dueDate: '2026-09-26' });
  assert.deepEqual(newAssignmentDates('2026-12-28'), { startDate: '2026-12-28', dueDate: '2027-01-04' });
});

test('the mobile spelling scanner opens from snapshot children before its history request completes', () => {
  const source=fs.readFileSync('public/guard-admin/cloud-spelling.js','utf8');
  assert.ok(source.includes('getStudents().filter'));
  assert.ok(source.includes("openModal();byId('spelling-list-student').focus()"));
  assert.match(fs.readFileSync('public/guard-admin/cloud-mobile.css','utf8'),/#spelling-list-modal .spelling-photo-actions{display:grid;grid-template-columns:1fr 1fr/);
});
