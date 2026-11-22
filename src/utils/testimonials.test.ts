import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TESTIMONIALS } from '../data/protecDefaults';
import { calculateRatingSummary, filterTestimonialsByCategory } from './testimonials';

test('calculateRatingSummary handles populated and empty testimonial arrays', () => {
  const empty = calculateRatingSummary([]);
  assert.deepEqual(empty, {
    averageRating: 0,
    totalCount: 0,
    fiveStarCount: 0,
  });

  const summary = calculateRatingSummary(DEFAULT_TESTIMONIALS);
  assert.equal(summary.totalCount, 4);
  assert.equal(summary.averageRating, 5.0);
  assert.equal(summary.fiveStarCount, 3);
});

test('filterTestimonialsByCategory filters cleanly by serviceCategory', () => {
  assert.equal(filterTestimonialsByCategory(DEFAULT_TESTIMONIALS, 'all').length, 4);
  const irrigation = filterTestimonialsByCategory(DEFAULT_TESTIMONIALS, 'irrigation');
  assert.equal(irrigation.length, 1);
  assert.equal(irrigation[0].id, 'rev-smart-irrigation-katameya');
});
