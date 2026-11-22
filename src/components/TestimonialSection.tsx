import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Language, ProjectCategory, TestimonialItem } from '../types';
import { calculateRatingSummary, filterTestimonialsByCategory } from '../utils/testimonials';
import { ScrollReveal } from './ScrollReveal';

interface TestimonialSectionProps {
  lang: Language;
  testimonials: TestimonialItem[];
}

export const TestimonialSection: React.FC<TestimonialSectionProps> = ({
  lang,
  testimonials,
}) => {
  const isAr = lang === 'ar';
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProjectCategory>('all');

  const summary = calculateRatingSummary(testimonials);
  const filtered = filterTestimonialsByCategory(testimonials, selectedCategory);

  const filterTabs: { id: 'all' | ProjectCategory; labelAr: string; labelEn: string }[] = [
    { id: 'all', labelAr: 'جميع التقييمات', labelEn: 'All Reviews' },
    { id: 'plant-protection', labelAr: 'وقاية النبات', labelEn: 'Plant Protection' },
    { id: 'landscaping', labelAr: 'اللاندسكيب', labelEn: 'Landscaping' },
    { id: 'irrigation', labelAr: 'شبكات الري', labelEn: 'Irrigation' },
    { id: 'maintenance', labelAr: 'الصيانة الدورية', labelEn: 'Maintenance' },
  ];

  const renderStars = (rating: number) => {
    const fullCount = Math.round(rating);
    return (
      <div
        className="flex items-center gap-0.5"
        aria-label={isAr ? `تقييم ${rating} من 5` : `Rated ${rating} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const filled = starIndex <= fullCount;
          return (
            <Star
              key={starIndex}
              className={`w-4 h-4 ${
                filled
                  ? 'fill-[#65B32E] text-[#65B32E]'
                  : 'fill-transparent text-[#C4D4C8] dark:text-[#3A5342]'
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>
    );
  };

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="bg-[#F1F6F2]/55 dark:bg-[#0D1711] py-16 lg:py-24 border-b border-[#DCE6DE] dark:border-[#1E3326]"
    >
      <ScrollReveal className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Quantitative Rating Summary */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold text-[#0B5D27] dark:text-[#7AD959] mb-2">
              {isAr ? 'شهادات عملاء Protec' : 'Client Proof & Verified Outcomes'}
            </p>
            <h2
              id="testimonials-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#102116] dark:text-[#ECF4EE] mb-3"
              style={{ textWrap: 'balance' }}
            >
              {isAr
                ? 'آراء العملاء وتقييمات المشروعات المنفذة'
                : 'Verified Client Reviews & Project Outcomes'}
            </h2>
            <p className="text-sm sm:text-base text-[#4B6152] dark:text-[#A3B9AA]">
              {isAr
                ? 'تقييمات موثقة من ملاك الفيلات ومديري المرافق والكمبوندات بعد تنفيذ أعمال الوقاية واللاندسكيب وشبكات الري.'
                : 'Attributable feedback from villa owners, facility directors, and landscape managers after Protec interventions.'}
            </p>
          </div>

          {/* Summary Score Readout */}
          <div className="bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-xl px-6 py-4 flex items-center gap-5 shrink-0">
            <div>
              <div className="font-mono-num text-3xl font-extrabold text-[#0B5D27] dark:text-[#7AD959] tabular-nums leading-none">
                {summary.averageRating.toFixed(1)}
                <span className="text-sm font-semibold text-[#4B6152] dark:text-[#A3B9AA]"> / 5.0</span>
              </div>
              <span className="text-xs text-[#4B6152] dark:text-[#A3B9AA] mt-1 block">
                {isAr ? 'متوسط تقييم العملاء' : 'Average Client Rating'}
              </span>
            </div>

            <div className="h-10 w-px bg-[#DCE6DE] dark:bg-[#213629]" aria-hidden="true" />

            <div>
              {renderStars(summary.averageRating)}
              <span className="text-xs text-[#4B6152] dark:text-[#A3B9AA] mt-1.5 block font-mono-num tabular-nums">
                {isAr
                  ? `${summary.totalCount} تقييمات مشاريع موثقة`
                  : `${summary.totalCount} verified project reviews`}
              </span>
            </div>
          </div>
        </div>

        {/* Service Category Filter Tabs */}
        <div className="mb-8 flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-[#111E16] rounded-xl border border-[#DCE6DE] dark:border-[#213629] w-fit max-w-full">
          {filterTabs.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                  active
                    ? 'bg-[#0B5D27] text-white'
                    : 'text-[#2E4235] dark:text-[#C4D8CA] hover:bg-[#F7FAF7] dark:hover:bg-[#17281D] hover:text-[#102116] dark:hover:text-[#ECF4EE]'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            );
          })}
        </div>

        {/* Testimonials Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-xl p-10 text-center text-sm text-[#4B6152] dark:text-[#A3B9AA]">
            {isAr
              ? 'لا توجد تقييمات مسجلة تحت هذا التخصص حالياً.'
              : 'No reviews found for this category yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((item) => {
              const author = isAr ? item.authorNameAr : item.authorNameEn;
              const role = isAr ? item.roleAr : item.roleEn;
              const org = isAr ? item.organizationAr : item.organizationEn;
              const location = isAr ? item.locationAr : item.locationEn;
              const serviceLabel = isAr ? item.serviceLabelAr : item.serviceLabelEn;
              const beforeState = isAr ? item.beforeStateAr : item.beforeStateEn;
              const outcome = isAr ? item.outcomeAr : item.outcomeEn;
              const quote = isAr ? item.quoteAr : item.quoteEn;

              return (
                <article
                  key={item.id}
                  className="bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        {renderStars(item.rating)}
                        <span className="font-mono-num text-xs font-bold text-[#102116] dark:text-[#ECF4EE] tabular-nums">
                          {item.rating.toFixed(1)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#4B6152] dark:text-[#A3B9AA]">
                        <span className="font-semibold text-[#0B5D27] dark:text-[#7AD959]">{serviceLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num tabular-nums">{item.dateLabel}</span>
                      </div>
                    </div>

                    <blockquote className="text-sm sm:text-base text-[#102116] dark:text-[#ECF4EE] leading-relaxed mb-5">
                      “{quote}”
                    </blockquote>

                    <div className="bg-[#F7FAF7] dark:bg-[#0D1711] border border-[#DCE6DE] dark:border-[#213629] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block font-bold text-[#4B6152] dark:text-[#A3B9AA] mb-0.5">
                          {isAr ? 'قبل التدخل' : 'Before'}
                        </span>
                        <span className="text-[#102116] dark:text-[#ECF4EE]">{beforeState}</span>
                      </div>
                      <div>
                        <span className="block font-bold text-[#0B5D27] dark:text-[#7AD959] mb-0.5">
                          {isAr ? 'النتيجة المحققة' : 'Outcome'}
                        </span>
                        <span className="font-semibold text-[#102116] dark:text-[#ECF4EE]">{outcome}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#EDF2EE] dark:border-[#1E3326] flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#102116] dark:text-[#ECF4EE]">{author}</div>
                      <div className="text-xs text-[#4B6152] dark:text-[#A3B9AA]">
                        {role} · {org}
                      </div>
                    </div>
                    <span className="text-xs text-[#4B6152] dark:text-[#A3B9AA]">{location}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </ScrollReveal>
    </section>
  );
};
