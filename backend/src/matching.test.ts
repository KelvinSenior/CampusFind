import assert from 'node:assert/strict';
import test from 'node:test';
import { findPotentialMatches, scorePotentialMatch } from './matching.js';
import type { ItemReport } from '@prisma/client';

function report(overrides: Partial<ItemReport> = {}): ItemReport {
  return {
    id: 'report-id',
    reference: 'CF-TEST',
    userId: 'student-id',
    reportType: 'LOST',
    itemName: 'Blue wireless headphones',
    category: 'ELECTRONICS',
    description: 'Navy blue headphones in a soft zip case',
    identifyingDetails: null,
    photoUrl: null,
    dateOccurred: new Date('2026-10-10T12:00:00Z'),
    location: 'LIBRARY',
    locationDetails: null,
    status: 'APPROVED',
    createdAt: new Date('2026-10-11T12:00:00Z'),
    updatedAt: new Date('2026-10-11T12:00:00Z'),
    ...overrides,
  };
}

test('scores category, keywords, location, and close dates as match signals', () => {
  const lost = report();
  const found = report({
    id: 'found-id',
    reference: 'CF-FOUND',
    reportType: 'FOUND',
    itemName: 'Blue headphones',
    dateOccurred: new Date('2026-10-11T12:00:00Z'),
  });
  const result = scorePotentialMatch(lost, found);
  assert.equal(result.score, 86);
  assert.deepEqual(result.reasons, ['same category', 'similar item details', 'same campus area', 'dates are close']);
});

test('excludes unrelated reports and orders suggestions by score', () => {
  const lost = report();
  const close = report({ id: 'close', reportType: 'FOUND', itemName: 'Blue headphones' });
  const unrelated = report({
    id: 'unrelated',
    reportType: 'FOUND',
    category: 'DOCUMENTS',
    itemName: 'Paper form',
    description: 'Official form for an office appointment',
    location: 'ADMIN_BLOCK',
    dateOccurred: new Date('2026-07-01T12:00:00Z'),
  });
  const results = findPotentialMatches(lost, [unrelated, close]);
  assert.deepEqual(results.map((match) => match.report.id), ['close']);
  assert.equal(results[0].score, 86);
});
