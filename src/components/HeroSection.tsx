import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Language, SiteContent } from '../types';
import { SafeImage } from './SafeImage';

interface HeroSectionProps {
  lang: Language;
  content: SiteContent;
  servicesCount: number;
  onRequestQuote: () => void;
  onExploreServices: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  lang,
  content,
  servicesCount,
  onRequestQuote,
  onExploreServices,
}) => {
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const stats = isAr
    ? [
        { value: `${servicesCount}`, label: 'تخصصات هندسية وزراعية' },
        { value: '40%', label: 'توفير مياه بشبكات الري الذكية' },
        { value: '48h', label: 'معاينة وتقييم فني مبدئي' },
        { value: '100%', label: 'برامج وقاية معتمدة وآمنة' },
      ]
    : [
        { value: `${servicesCount}`, label: 'Engineering & Agronomy Disciplines' },
        { value: '40%', label: 'Water Saved via Hydro-Zoned Irrigation' },
        { value: '48h', label: 'Initial Site Inspection Turnaround' },
        { value: '100%', label: 'Certified Low-Residue IPM Safety' },
      ];

  return (
    <section
      id="top"
      className="bg-white dark:bg-[#09110C] border-b border-[#DCE6DE] dark:border-[#1E3326]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Copy Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0B5D27] dark:text-[#7AD959] mb-5">
              <span>{isAr ? 'بروتك لوقاية النبات' : 'Protec Plant Health'}</span>
              <span aria-hidden="true" className="text-[#9DB3A4] dark:text-[#4E6957]">
                ·
              </span>
              <span>{isAr ? 'مكافحة الآفات' : 'Integrated Pest Control'}</span>
              <span aria-hidden="true" className="text-[#9DB3A4] dark:text-[#4E6957]">
                ·
              </span>
              <span>{isAr ? 'اللاندسكيب وشبكات الري' : 'Landscaping & Irrigation'}</span>
            </div>

            <h1
              className="text-[clamp(2.1rem,3.8vw,3.4rem)] font-extrabold text-[#102116] dark:text-[#ECF4EE] leading-[1.2] tracking-tight mb-6"
              style={{ textWrap: 'balance' }}
            >
              {isAr ? content.heroTitleAr : content.heroTitleEn}
            </h1>

            <p className="text-base sm:text-lg text-[#4B6152] dark:text-[#A3B9AA] leading-relaxed mb-8 max-w-2xl">
              {isAr ? content.heroSubtitleAr : content.heroSubtitleEn}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onRequestQuote}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-bold text-white bg-[#0B5D27] hover:bg-[#08431C] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[48px]"
              >
                <span>{isAr ? 'اطلب عرض سعر ومعاينة' : 'Request Site Quote'}</span>
                <ArrowIcon className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onExploreServices}
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm sm:text-base font-semibold text-[#0B5D27] dark:text-[#7AD959] bg-[#F1F6F2] dark:bg-[#14241A] hover:bg-[#E2EDE5] dark:hover:bg-[#1C3224] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[48px]"
              >
                {isAr ? 'استعراض خدماتنا' : 'Explore Services'}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#DCE6DE] dark:border-[#1E3326] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-[#4B6152] dark:text-[#A3B9AA]">
              <span>
                {isAr ? 'استشارات مباشرة:' : 'Direct Line:'}{' '}
                <a
                  href={`tel:${content.phones[0] || '01036084725'}`}
                  dir="ltr"
                  className="font-mono-num font-semibold text-[#102116] dark:text-[#ECF4EE] hover:text-[#0B5D27] dark:hover:text-[#7AD959]"
                >
                  {content.phones[0] || '01036084725'}
                </a>
              </span>
              <span aria-hidden="true" className="text-[#C4D4C8] dark:text-[#3A5342]">
                /
              </span>
              <a
                href={`tel:${content.phones[1] || '01065324190'}`}
                dir="ltr"
                className="font-mono-num font-semibold text-[#102116] dark:text-[#ECF4EE] hover:text-[#0B5D27] dark:hover:text-[#7AD959]"
              >
                {content.phones[1] || '01065324190'}
              </a>
            </div>
          </div>

          {/* Dominant Visual Anchor */}
          <div className="lg:col-span-6">
            <div className="w-full h-full min-h-[300px] lg:min-h-[460px] rounded-2xl overflow-hidden border border-[#DCE6DE] dark:border-[#1E3326] bg-[#F7FAF7] dark:bg-[#111E16]">
              <SafeImage
                src={content.heroImageUrl}
                alt={
                  isAr
                    ? 'مشروع لاندسكيب وشبكات ري من تنفيذ شركة بروتك'
                    : 'Protec architectural landscaping and smart irrigation project'
                }
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column Proof Strip */}
      <div className="bg-[#F7FAF7] dark:bg-[#0E1912] border-t border-[#DCE6DE] dark:border-[#1E3326]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:rtl:divide-x-reverse divide-[#DCE6DE] dark:divide-[#1E3326]">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-center lg:px-6 first:lg:ps-0 last:lg:pe-0"
            >
              <span className="font-mono-num text-2xl sm:text-3xl font-bold text-[#0B5D27] dark:text-[#7AD959] tabular-nums">
                {stat.value}
              </span>
              <span className="text-xs sm:text-sm text-[#4B6152] dark:text-[#A3B9AA] mt-1 font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
