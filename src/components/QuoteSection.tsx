import React, { useEffect, useState } from 'react';
import { CheckCircle2, Film, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { Language, OfferItem, QuoteAttachment, ServiceItem } from '../types';
import { validateQuoteInput } from '../utils/validation';
import { submitQuoteToServer } from '../lib/adminApi';
import { submitQuoteRequest } from '../lib/firestoreService';
import { ScrollReveal } from './ScrollReveal';

interface QuoteSectionProps {
  lang: Language;
  services: ServiceItem[];
  preselectedServiceSlug?: string;
  preselectedOffer?: OfferItem | null;
  onClearPreselectedOffer: () => void;
}

const GOVERNORATES_AR = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'البحيرة',
  'المنوفية',
  'الغربية',
  'السويس',
  'الإسماعيلية',
  'بورسعيد',
  'مطروح / الساحل الشمالي',
  'البحر الأحمر',
  'محافظة أخرى',
];

const GOVERNORATES_EN = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Qalyubia',
  'Sharqia',
  'Dakahlia',
  'Beheira',
  'Monufia',
  'Gharbia',
  'Suez',
  'Ismailia',
  'Port Said',
  'Matrouh / North Coast',
  'Red Sea',
  'Other Governorate',
];

export const QuoteSection: React.FC<QuoteSectionProps> = ({
  lang,
  services,
  preselectedServiceSlug,
  preselectedOffer,
  onClearPreselectedOffer,
}) => {
  const isAr = lang === 'ar';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [serviceType, setServiceType] = useState(
    preselectedServiceSlug || services[0]?.slug || 'landscape-design'
  );
  const [projectAreaSqm, setProjectAreaSqm] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceCode: string;
    fullName: string;
  } | null>(null);

  useEffect(() => {
    if (preselectedServiceSlug) {
      setServiceType(preselectedServiceSlug);
    }
  }, [preselectedServiceSlug]);

  useEffect(() => {
    if (preselectedOffer) {
      setServiceType(preselectedOffer.serviceType);
      setDescription((prev) =>
        prev.trim()
          ? prev
          : isAr
            ? `أرغب في الاستفادة من عرض: ${preselectedOffer.titleAr}`
            : `Inquiry regarding offer: ${preselectedOffer.titleEn}`
      );
    }
  }, [preselectedOffer, isAr]);

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = 10 - attachments.length;
    if (remainingSlots <= 0) {
      setUploadError(
        isAr ? 'الحد الأقصى هو 10 ملفات مرفقة.' : 'Maximum of 10 attachments allowed.'
      );
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);
    const formData = new FormData();
    for (const file of filesToUpload) {
      formData.append('files', file);
    }

    setUploadingMedia(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/uploads/quote', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as {
        files?: QuoteAttachment[];
        error?: string;
      };
      if (!response.ok || !payload.files) {
        throw new Error(payload.error || 'Upload failed');
      }
      setAttachments((prev) => [...prev, ...payload.files!]);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : isAr
            ? 'تعذر رفع الملفات، تأكد من الصيغة والحجم.'
            : 'Upload failed. Check file format and size.'
      );
    } finally {
      setUploadingMedia(false);
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateQuoteInput({
      fullName,
      phone,
      email,
      governorate,
      area,
      address,
      serviceType,
      projectAreaSqm,
      description,
      offerId: preselectedOffer?.id,
      attachments,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const serverQuote = await submitQuoteToServer({
        fullName,
        phone,
        email: email.trim() || undefined,
        governorate,
        area,
        address,
        serviceType,
        projectAreaSqm: projectAreaSqm.trim() ? Number(projectAreaSqm) : undefined,
        description,
        offerId: preselectedOffer?.id,
        attachments,
      });

      // Also sync cleanly to Firestore when available (non-blocking if offline)
      void submitQuoteRequest({
        id: serverQuote.id,
        referenceCode: serverQuote.referenceCode,
        fullName,
        phone,
        email: email.trim() || undefined,
        governorate,
        area,
        address,
        serviceType,
        projectAreaSqm: projectAreaSqm.trim() ? Number(projectAreaSqm) : undefined,
        description,
        offerId: preselectedOffer?.id,
        attachments,
      }).catch(() => undefined);

      setConfirmation({
        referenceCode: serverQuote.referenceCode,
        fullName: fullName.trim(),
      });
      setFullName('');
      setPhone('');
      setEmail('');
      setGovernorate('');
      setArea('');
      setAddress('');
      setProjectAreaSqm('');
      setDescription('');
      setAttachments([]);
      onClearPreselectedOffer();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : isAr
            ? 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.'
            : 'Unable to submit request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const governorateOptions = isAr ? GOVERNORATES_AR : GOVERNORATES_EN;

  return (
    <section
      id="quote"
      className="bg-white dark:bg-[#09110C] py-16 lg:py-24 border-b border-[#DCE6DE] dark:border-[#1E3326]"
    >
      <ScrollReveal className="max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-bold text-[#0B5D27] dark:text-[#7AD959] mb-2">
            {isAr ? 'طلب معاينة وعرض سعر فني' : 'Technical Quote & Site Survey'}
          </p>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#102116] dark:text-[#ECF4EE] mb-3"
            style={{ textWrap: 'balance' }}
          >
            {isAr ? 'اطلب عرض سعر لمشروعك أو حديقتك' : 'Request a Tailored Project Quote'}
          </h2>
          <p className="text-sm sm:text-base text-[#4B6152] dark:text-[#A3B9AA] max-w-2xl">
            {isAr
              ? 'أرسل بيانات الموقع وأرفق صوراً أو فيديو للحديقة أو الإصابة النباتية ليقوم مهندسو Protec بمراجعتها وإعداد عرض فني ومالي دقيق.'
              : 'Share your site details and attach photos or a short walkthrough video so Protec engineers can prepare an accurate technical and financial proposal.'}
          </p>
        </div>

        {preselectedOffer && (
          <div className="mb-6 bg-[#F1F6F2] dark:bg-[#111E16] border border-[#0B5D27]/30 dark:border-[#65B32E]/40 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-[#102116] dark:text-[#ECF4EE]">
              <span className="font-bold text-[#0B5D27] dark:text-[#7AD959]">
                {isAr ? 'العرض المرتبط بالطلب: ' : 'Linked Offer: '}
              </span>
              <span>{isAr ? preselectedOffer.titleAr : preselectedOffer.titleEn}</span>
            </div>
            <button
              type="button"
              onClick={onClearPreselectedOffer}
              className="text-xs font-semibold text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#102116] dark:hover:text-[#ECF4EE] underline"
            >
              {isAr ? 'إلغاء الربط' : 'Unlink'}
            </button>
          </div>
        )}

        {confirmation ? (
          <div
            role="status"
            className="bg-[#F7FAF7] dark:bg-[#111E16] border border-[#0B5D27]/30 dark:border-[#65B32E]/40 rounded-2xl p-8 sm:p-10 text-center"
          >
            <CheckCircle2 className="w-12 h-12 text-[#0B5D27] dark:text-[#7AD959] mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#102116] dark:text-[#ECF4EE] mb-2">
              {isAr ? 'تم استلام طلبك بنجاح!' : 'Your Quote Request Has Been Received!'}
            </h3>
            <p className="text-sm sm:text-base text-[#4B6152] dark:text-[#A3B9AA] max-w-xl mx-auto mb-5">
              {isAr
                ? `شكراً لتواصلك مع Protec يا ${confirmation.fullName}. وصلت جميع البيانات والمرفقات إلى الإدارة الهندسية وسيتم التواصل معك خلال أقرب وقت.`
                : `Thank you, ${confirmation.fullName}. Your project details and media attachments have been securely delivered to the Protec engineering team.`}
            </p>
            <div className="inline-block bg-white dark:bg-[#0D1711] border border-[#DCE6DE] dark:border-[#213629] rounded-xl px-6 py-3 mb-6">
              <span className="text-xs text-[#4B6152] dark:text-[#A3B9AA] block mb-1">
                {isAr ? 'الرقم المرجعي للطلب' : 'Reference Code'}
              </span>
              <span className="font-mono-num text-lg font-bold text-[#0B5D27] dark:text-[#7AD959] tabular-nums">
                {confirmation.referenceCode}
              </span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B5D27] hover:bg-[#08431C] rounded-lg min-h-[44px]"
              >
                {isAr ? 'إرسال طلب جديد' : 'Submit Another Request'}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-[#F7FAF7] dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label htmlFor="quote-fullname" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'الاسم بالكامل *' : 'Full Name *'}
                </label>
                <input
                  id="quote-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isAr ? 'مثال: م. كريم عبد الله' : 'e.g. Karim Abdallah'}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] placeholder:text-[#7A9182] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'يرجى إدخال الاسم بالكامل (حرفين على الأقل).' : 'Please enter your full name.'}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="quote-phone" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
                </label>
                <input
                  id="quote-phone"
                  type="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] placeholder:text-[#7A9182] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.'}
                  </p>
                )}
              </div>

              {/* Email (optional) */}
              <div>
                <label htmlFor="quote-email" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'البريد الإلكتروني (اختياري)' : 'Email Address (Optional)'}
                </label>
                <input
                  id="quote-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] placeholder:text-[#7A9182] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Invalid email address format.'}
                  </p>
                )}
              </div>

              {/* Governorate */}
              <div>
                <label htmlFor="quote-gov" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'المحافظة *' : 'Governorate *'}
                </label>
                <select
                  id="quote-gov"
                  required
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                >
                  <option value="">{isAr ? 'اختر المحافظة...' : 'Select governorate...'}</option>
                  {governorateOptions.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
                {fieldErrors.governorate && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'يرجى اختيار المحافظة.' : 'Please select a governorate.'}
                  </p>
                )}
              </div>

              {/* Area / District */}
              <div>
                <label htmlFor="quote-area" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'المنطقة / المدينة *' : 'Area / District *'}
                </label>
                <input
                  id="quote-area"
                  type="text"
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={isAr ? 'مثال: التجمع الخامس / الشيخ زايد' : 'e.g. New Cairo / Sheikh Zayed'}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] placeholder:text-[#7A9182] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
                {fieldErrors.area && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'يرجى إدخال المنطقة أو المدينة.' : 'Please enter the area or district.'}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label htmlFor="quote-address" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'العنوان التفصيلي *' : 'Detailed Address *'}
                </label>
                <input
                  id="quote-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isAr ? 'الكمبوند / الشارع / رقم الفيلا' : 'Compound, street, villa number'}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] placeholder:text-[#7A9182] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
                {fieldErrors.address && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'يرجى إدخال العنوان التفصيلي.' : 'Please enter the detailed address.'}
                  </p>
                )}
              </div>

              {/* Service Type */}
              <div>
                <label htmlFor="quote-service" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'نوع الخدمة المطلوبة *' : 'Required Service *'}
                </label>
                <select
                  id="quote-service"
                  required
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.slug}>
                      {isAr ? srv.titleAr : srv.titleEn}
                    </option>
                  ))}
                  <option value="other-consultation">
                    {isAr ? 'استشارة متكاملة / أكثر من خدمة' : 'Comprehensive Consultation / Multiple Services'}
                  </option>
                </select>
                {fieldErrors.serviceType && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'يرجى اختيار نوع الخدمة.' : 'Please select a service.'}
                  </p>
                )}
              </div>

              {/* Project Area m2 */}
              <div>
                <label htmlFor="quote-sqm" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                  {isAr ? 'مساحة المشروع بالمتر المربع (إن وجدت)' : 'Project Area in m² (Optional)'}
                </label>
                <input
                  id="quote-sqm"
                  type="number"
                  min={0}
                  step="any"
                  dir="ltr"
                  value={projectAreaSqm}
                  onChange={(e) => setProjectAreaSqm(e.target.value)}
                  placeholder="350"
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] font-mono-num tabular-nums focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
                {fieldErrors.projectAreaSqm && (
                  <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                    {isAr ? 'أدخل مساحة رقمية صحيحة.' : 'Enter a valid numeric area.'}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="quote-desc" className="block text-sm font-semibold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                {isAr ? 'وصف وتفاصيل المشروع أو المشكلة النباتية *' : 'Project Details or Plant Issue Description *'}
              </label>
              <textarea
                id="quote-desc"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب تفاصيل الحديقة، الأعراض الظاهرة على النباتات، أو متطلبات اللاندسكيب وشبكة الري...'
                    : 'Describe your garden layout, plant symptoms, irrigation needs, or landscaping goals...'
                }
                className="w-full px-4 py-3 bg-white dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] placeholder:text-[#7A9182] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E]"
              />
              {fieldErrors.description && (
                <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-1">
                  {isAr ? 'يرجى كتابة وصف مختصر لا يقل عن 5 أحرف.' : 'Please provide at least 5 characters.'}
                </p>
              )}
            </div>

            {/* Photos & Video Upload */}
            <div className="bg-white dark:bg-[#0D1711] border border-[#DCE6DE] dark:border-[#213629] rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <span className="block text-sm font-bold text-[#102116] dark:text-[#ECF4EE]">
                    {isAr ? 'صور وفيديو الموقع أو الحديقة (اختياري)' : 'Site Photos & Video Attachments (Optional)'}
                  </span>
                  <span className="text-xs text-[#4B6152] dark:text-[#A3B9AA]">
                    {isAr
                      ? 'يمكنك رفع حتى 10 ملفات (صور JPG/PNG/WEBP أو فيديو MP4/WEBM/MOV) — بحد أقصى 40 ميجابايت للملف.'
                      : 'Upload up to 10 files (JPG/PNG/WEBP photos or MP4/WEBM/MOV video, max 40MB per file).'}
                  </span>
                </div>

                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0B5D27] dark:text-[#7AD959] bg-[#F1F6F2] dark:bg-[#14241A] hover:bg-[#E2EDE5] dark:hover:bg-[#1C3224] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg cursor-pointer whitespace-nowrap shrink-0 min-h-[44px]">
                  {uploadingMedia ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>
                    {uploadingMedia
                      ? isAr
                        ? 'جاري الرفع...'
                        : 'Uploading...'
                      : isAr
                        ? 'إرفاق صور أو فيديو'
                        : 'Attach Photos / Video'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    onChange={handleFilesSelected}
                    disabled={uploadingMedia || attachments.length >= 10}
                    className="sr-only"
                  />
                </label>
              </div>

              {uploadError && (
                <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5] mt-2">{uploadError}</p>
              )}

              {attachments.length > 0 && (
                <ul className="mt-4 divide-y divide-[#EDF2EE] dark:divide-[#1E3326] border border-[#DCE6DE] dark:border-[#213629] rounded-lg">
                  {attachments.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {file.kind === 'video' ? (
                          <Film className="w-4 h-4 text-[#0B5D27] dark:text-[#7AD959] shrink-0" aria-hidden="true" />
                        ) : (
                          <ImagePlus className="w-4 h-4 text-[#0B5D27] dark:text-[#7AD959] shrink-0" aria-hidden="true" />
                        )}
                        <span className="font-medium text-[#102116] dark:text-[#ECF4EE] truncate">
                          {file.originalName}
                        </span>
                        <span className="text-[#4B6152] dark:text-[#A3B9AA] font-mono-num tabular-nums shrink-0">
                          {formatBytes(file.size)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(file.id)}
                        aria-label={
                          isAr ? `حذف الملف ${file.originalName}` : `Remove ${file.originalName}`
                        }
                        className="p-2 text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {submitError && (
              <div role="alert" className="p-3.5 bg-[#FEF2F2] dark:bg-[#2A1215] border border-[#FECACA] dark:border-[#7F1D1D] text-[#B91C1C] dark:text-[#FCA5A5] text-sm rounded-lg">
                {submitError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="text-xs text-[#4B6152] dark:text-[#A3B9AA]">
                {isAr
                  ? 'بياناتك ومرفقاتك محمية ولا تطلع عليها سوى الإدارة المختصة في شركة Protec.'
                  : 'Your contact info and uploaded site media are strictly protected for Protec engineering review only.'}
              </p>

              <button
                type="submit"
                disabled={submitting || uploadingMedia}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm sm:text-base font-bold text-white bg-[#0B5D27] hover:bg-[#08431C] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[48px]"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>{isAr ? 'إرسال طلب عرض السعر' : 'Submit Quote Request'}</span>
              </button>
            </div>
          </form>
        )}
      </ScrollReveal>
    </section>
  );
};
