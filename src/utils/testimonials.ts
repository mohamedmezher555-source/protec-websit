import { ProjectCategory, TestimonialItem } from '../types';

export interface RatingSummary {
  averageRating: number;
  totalCount: number;
  fiveStarCount: number;
}

export function calculateRatingSummary(testimonials: TestimonialItem[]): RatingSummary {
  if (testimonials.length === 0) {
    return {
      averageRating: 0,
      totalCount: 0,
      fiveStarCount: 0,
    };
  }

  const total = testimonials.reduce((sum, item) => sum + item.rating, 0);
  const averageRating = Math.round((total / testimonials.length) * 10) / 10;
  const fiveStarCount = testimonials.filter((item) => item.rating >= 4.9).length;

  return {
    averageRating,
    totalCount: testimonials.length,
    fiveStarCount,
  };
}

export function filterTestimonialsByCategory(
  testimonials: TestimonialItem[],
  category: 'all' | ProjectCategory
): TestimonialItem[] {
  if (category === 'all') return testimonials;
  return testimonials.filter((item) => item.serviceCategory === category);
}
