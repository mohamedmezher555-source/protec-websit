import React, { useEffect, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { saveServerSiteContent, uploadAdminImageWithToken } from '../../lib/adminApi';
import { saveSiteContent } from '../../lib/firestoreService';
import { Language, SiteContent } from '../../types';

interface AdminSiteSettingsTabProps {
  lang: Language;
  mode: 'homepage' | 'company';
  content: SiteContent;
  onRefresh: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  isFirebaseAdmin: boolean;
}

export const AdminSiteSettingsTab: React.FC<AdminSiteSettingsTabProps> = ({
  lang,
  mode,
  content,
  onRefresh,
  getAuthToken,
  isFirebaseAdmin,
}) => {
  const isAr = lang === 'ar';
  const [draft, setDraft] = useState<SiteContent>(content);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraft(content);
  }, [content]);

  const handleUploadHeroImage = async (file: File | undefined) => {
    if (!file) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const url = await uploadAdminImageWithToken(token, file);
      setDraft((prev) => ({ ...prev, heroImageUrl: url }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    setErrorMsg(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      await saveServerSiteContent(token, draft);
      if (isFirebaseAdmin) {
        await saveSiteContent(draft).catch(() => undefined);
      }
      await onRefresh();
      setSavedNotice(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save site settings');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 bg-white dark:bg-[#0D1711] border border-[#DCE6DE] dark:border-[#213629] text-[#102116] dark:text-[#ECF4EE] rounded-lg text-sm';

  return (
    <form
      onSubmit={handleSave}
      className="bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-xl p-6 space-y-6 text-[#102116] dark:text-[#ECF4EE]"
    >
      {mode === 'homepage' ? (
        <>
          <h3 className="text-lg font-bold text-[#102116] dark:text-[#ECF4EE]">
            {isAr ? 'إدارة محتوى الصفحة الرئيسية ومن نحن' : 'Homepage & About Content'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">عنوان الواجهة الرئيسية (عربي)</label>
              <input
                type="text"
                value={draft.heroTitleAr}
                onChange={(e) => setDraft({ ...draft, heroTitleAr: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Hero Headline (EN)</label>
              <input
                type="text"
                dir="ltr"
                value={draft.heroTitleEn}
                onChange={(e) => setDraft({ ...draft, heroTitleEn: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">الوصف المختصر للواجهة (عربي)</label>
              <textarea
                rows={3}
                value={draft.heroSubtitleAr}
                onChange={(e) => setDraft({ ...draft, heroSubtitleAr: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Hero Subtitle (EN)</label>
              <textarea
                rows={3}
                dir="ltr"
                value={draft.heroSubtitleEn}
                onChange={(e) => setDraft({ ...draft, heroSubtitleEn: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'صورة الواجهة الرئيسية' : 'Hero Image URL'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={draft.heroImageUrl}
                onChange={(e) => setDraft({ ...draft, heroImageUrl: e.target.value })}
                className={inputCls}
              />
            </div>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#F1F6F2] dark:bg-[#17281D] text-[#0B5D27] dark:text-[#7AD959] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg cursor-pointer whitespace-nowrap">
              <Upload className="w-4 h-4" />
              <span>{isAr ? 'رفع صورة جديدة' : 'Upload Hero Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void handleUploadHeroImage(e.target.files?.[0])}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#DCE6DE] dark:border-[#213629]">
            <div>
              <label className="block text-xs font-bold mb-1">من هي Protec (عربي)</label>
              <textarea
                rows={4}
                value={draft.aboutSummaryAr}
                onChange={(e) => setDraft({ ...draft, aboutSummaryAr: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Who is Protec (EN)</label>
              <textarea
                rows={4}
                dir="ltr"
                value={draft.aboutSummaryEn}
                onChange={(e) => setDraft({ ...draft, aboutSummaryEn: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">الرؤية (عربي)</label>
              <textarea
                rows={2}
                value={draft.visionAr}
                onChange={(e) => setDraft({ ...draft, visionAr: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Vision (EN)</label>
              <textarea
                rows={2}
                dir="ltr"
                value={draft.visionEn}
                onChange={(e) => setDraft({ ...draft, visionEn: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">الرسالة (عربي)</label>
              <textarea
                rows={2}
                value={draft.missionAr}
                onChange={(e) => setDraft({ ...draft, missionAr: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Mission (EN)</label>
              <textarea
                rows={2}
                dir="ltr"
                value={draft.missionEn}
                onChange={(e) => setDraft({ ...draft, missionEn: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold text-[#102116] dark:text-[#ECF4EE]">
            {isAr ? 'بيانات الشركة ووسائل التواصل' : 'Company Contact & Social Media'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'أرقام الهاتف (مفصولة بفاصلة)' : 'Phone Numbers (comma-separated)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={draft.phones.join(', ')}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    phones: e.target.value
                      .split(',')
                      .map((p) => p.trim())
                      .filter(Boolean),
                  })
                }
                className={`${inputCls} font-mono-num`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'رقم واتساب (مع كود الدولة)' : 'WhatsApp Number (with country code)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={draft.whatsappNumber}
                onChange={(e) => setDraft({ ...draft, whatsappNumber: e.target.value })}
                className={`${inputCls} font-mono-num`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'البريد الإلكتروني الرسمي' : 'Official Email'}
              </label>
              <input
                type="email"
                dir="ltr"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Facebook URL</label>
              <input
                type="url"
                dir="ltr"
                value={draft.facebookUrl}
                onChange={(e) => setDraft({ ...draft, facebookUrl: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Instagram URL</label>
              <input
                type="url"
                dir="ltr"
                value={draft.instagramUrl}
                onChange={(e) => setDraft({ ...draft, instagramUrl: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">LinkedIn URL</label>
              <input
                type="url"
                dir="ltr"
                value={draft.linkedinUrl}
                onChange={(e) => setDraft({ ...draft, linkedinUrl: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">العنوان (عربي)</label>
              <input
                type="text"
                value={draft.addressAr}
                onChange={(e) => setDraft({ ...draft, addressAr: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Address (EN)</label>
              <input
                type="text"
                dir="ltr"
                value={draft.addressEn}
                onChange={(e) => setDraft({ ...draft, addressEn: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </>
      )}

      {errorMsg && <p className="text-xs text-[#B91C1C] dark:text-[#FCA5A5]">{errorMsg}</p>}
      {savedNotice && (
        <p className="text-xs font-semibold text-[#0B5D27] dark:text-[#7AD959]">
          {isAr ? 'تم تحديث بيانات الموقع وحفظها فوراً.' : 'Site settings saved and published.'}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#0B5D27] hover:bg-[#08431C] rounded-lg min-h-[44px]"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isAr ? 'حفظ ونشر التعديلات' : 'Save & Publish Changes'}</span>
      </button>
    </form>
  );
};
