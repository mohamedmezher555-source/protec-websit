import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Database,
  FileText,
  FolderKanban,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  PhoneCall,
  Sprout,
  Tag,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { fetchServerQuotes } from '../../lib/adminApi';
import { fetchAllQuotes, seedInitialDatabaseIfEmpty } from '../../lib/firestoreService';
import {
  Language,
  OfferItem,
  ProjectItem,
  QuoteRequest,
  ServiceItem,
  SiteContent,
} from '../../types';
import { AdminCatalogTab } from './AdminCatalogTab';
import { AdminQuotesTab } from './AdminQuotesTab';
import { AdminSiteSettingsTab } from './AdminSiteSettingsTab';

type AdminTab = 'quotes' | 'services' | 'projects' | 'offers' | 'homepage' | 'company';

interface AdminDashboardProps {
  lang: Language;
  siteContent: SiteContent;
  services: ServiceItem[];
  projects: ProjectItem[];
  offers: OfferItem[];
  onRefreshPublicData: () => Promise<void>;
  onBackToSite: () => void;
}

function getCreatedTimeMs(createdAt: unknown): number {
  if (typeof createdAt === 'string') {
    const parsed = Date.parse(createdAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (createdAt && typeof createdAt === 'object' && 'toMillis' in createdAt) {
    const fn = (createdAt as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn.call(createdAt);
  }
  return 0;
}

function mergeQuotes(serverQuotes: QuoteRequest[], firestoreQuotes: QuoteRequest[]): QuoteRequest[] {
  const byId = new Map<string, QuoteRequest>();
  for (const q of firestoreQuotes) {
    byId.set(q.id, q);
  }
  for (const q of serverQuotes) {
    byId.set(q.id, q);
  }
  return Array.from(byId.values()).sort(
    (a, b) => getCreatedTimeMs(b.createdAt) - getCreatedTimeMs(a.createdAt)
  );
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  siteContent,
  services,
  projects,
  offers,
  onRefreshPublicData,
  onBackToSite,
}) => {
  const isAr = lang === 'ar';
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const {
    user,
    isFirebaseAdmin,
    isFullyAuthenticatedAdmin,
    signOutAdmin,
    getFirebaseIdToken,
    rotateFirestorePassword,
  } = useAdminAuth();

  // Dashboard data state
  const [activeTab, setActiveTab] = useState<AdminTab>('quotes');
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Rotate Firestore Admin Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [rotatingPassword, setRotatingPassword] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotateSuccess, setRotateSuccess] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    if (!isFullyAuthenticatedAdmin) return;
    setQuotesLoading(true);
    try {
      const token = await getFirebaseIdToken();
      const [serverList, firestoreList] = await Promise.all([
        token ? fetchServerQuotes(token).catch(() => []) : Promise.resolve([]),
        isFirebaseAdmin ? fetchAllQuotes().catch(() => []) : Promise.resolve([]),
      ]);
      setQuotes(mergeQuotes(serverList, firestoreList));
    } finally {
      setQuotesLoading(false);
    }
  }, [getFirebaseIdToken, isFirebaseAdmin, isFullyAuthenticatedAdmin]);

  useEffect(() => {
    if (isFullyAuthenticatedAdmin) {
      void loadQuotes();
    }
  }, [isFullyAuthenticatedAdmin, loadQuotes]);

  if (!isFullyAuthenticatedAdmin) {
    return null;
  }

  const handleSeedDatabase = async () => {
    setSeedMessage(null);
    const seeded = await seedInitialDatabaseIfEmpty();
    await onRefreshPublicData();
    setSeedMessage(
      seeded
        ? isAr
          ? 'تم حفظ البيانات الافتراضية في Firestore بنجاح.'
          : 'Default Protec data synced to Firestore.'
        : isAr
          ? 'قاعدة البيانات مهيأة بالفعل وتم تحديث البيانات.'
          : 'Database already populated and refreshed.'
    );
  };

  const handleRotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotateError(null);
    setRotateSuccess(null);

    if (newPassword.length < 8) {
      setRotateError(
        isAr ? 'يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل.' : 'New password must be at least 8 characters.'
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRotateError(
        isAr ? 'كلمتا المرور غير متطابقتين.' : 'New passwords do not match.'
      );
      return;
    }

    setRotatingPassword(true);
    try {
      await rotateFirestorePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setRotateSuccess(
        isAr
          ? 'تم تحديث كلمة مرور الإدارة في Firestore بنجاح.'
          : 'Firestore admin password updated successfully.'
      );
    } catch (err) {
      setRotateError(
        err instanceof Error
          ? err.message
          : isAr
            ? 'تعذر تحديث كلمة المرور.'
            : 'Unable to update admin password.'
      );
    } finally {
      setRotatingPassword(false);
    }
  };

  const tabs: { id: AdminTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    {
      id: 'quotes',
      labelAr: 'طلبات العملاء وعروض الأسعار',
      labelEn: 'Quote Requests',
      icon: <FileText className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'services',
      labelAr: 'إدارة الخدمات',
      labelEn: 'Services',
      icon: <Sprout className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'projects',
      labelAr: 'المشروعات (قبل وبعد)',
      labelEn: 'Projects',
      icon: <FolderKanban className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'offers',
      labelAr: 'العروض والباقات',
      labelEn: 'Offers',
      icon: <Tag className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'homepage',
      labelAr: 'الصفحة الرئيسية ومن نحن',
      labelEn: 'Homepage & About',
      icon: <Globe className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'company',
      labelAr: 'بيانات الشركة والتواصل',
      labelEn: 'Company Info',
      icon: <PhoneCall className="w-4 h-4" aria-hidden="true" />,
    },
  ];

  const signedInLabel = user?.email || 'protecprotection4@gmail.com';

  return (
    <div className="min-h-[85vh] bg-[#F7FAF7] dark:bg-[#09110C] py-8 transition-colors">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Workspace Header */}
        <div className="bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-xl px-6 py-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#4B6152] dark:text-[#A3B9AA]" dir="ltr">
              {isAr
                ? `Protec / لوحة تحكم الإدارة · ${signedInLabel}`
                : `Protec / Admin Dashboard · ${signedInLabel}`}
            </span>
            <h1 className="text-lg font-extrabold text-[#102116] dark:text-[#ECF4EE]">
              {isAr ? 'مركز إدارة المحتوى وطلبات العملاء' : 'Content & Lead Management Console'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleSeedDatabase()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F1F6F2] dark:bg-[#17281D] hover:bg-[#E2EDE5] dark:hover:bg-[#1F3527] text-[#0B5D27] dark:text-[#7AD959] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg min-h-[40px] whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAr ? 'مزامنة البيانات' : 'Sync Data'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRotateError(null);
                setRotateSuccess(null);
                setShowPasswordModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F7FAF7] dark:bg-[#14241A] hover:bg-[#EDF5EF] dark:hover:bg-[#1C3224] text-[#102116] dark:text-[#ECF4EE] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg min-h-[40px] whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#0B5D27] dark:text-[#7AD959]" aria-hidden="true" />
              <span>{isAr ? 'كلمة مرور الإدارة' : 'Admin Password'}</span>
            </button>

            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#102116] dark:text-[#ECF4EE] hover:bg-[#F7FAF7] dark:hover:bg-[#14241A] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg min-h-[40px] whitespace-nowrap"
            >
              <BackArrow className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAr ? 'عرض الموقع' : 'View Site'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuotes([]);
                void signOutAdmin();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1215] border border-[#FECACA] dark:border-[#5C2026] rounded-lg min-h-[40px] whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAr ? 'خروج' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {seedMessage && (
          <div className="mb-4 p-3 bg-white dark:bg-[#111E16] border border-[#0B5D27]/30 dark:border-[#7AD959]/30 text-xs font-semibold text-[#0B5D27] dark:text-[#7AD959] rounded-lg">
            {seedMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-xl p-3 space-y-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors text-start min-h-[44px] ${
                    active
                      ? 'bg-[#0B5D27] text-white'
                      : 'text-[#2E4235] dark:text-[#C4D8CA] hover:bg-[#F7FAF7] dark:hover:bg-[#17281D]'
                  }`}
                >
                  {tab.icon}
                  <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                </button>
              );
            })}
          </aside>

          {/* Main Admin Viewport */}
          <main className="lg:col-span-9">
            {activeTab === 'quotes' && (
              <AdminQuotesTab
                lang={lang}
                quotes={quotes}
                loading={quotesLoading}
                onRefresh={loadQuotes}
                getAuthToken={getFirebaseIdToken}
                isFirebaseAdmin={isFirebaseAdmin}
              />
            )}

            {(activeTab === 'services' || activeTab === 'projects' || activeTab === 'offers') && (
              <AdminCatalogTab
                lang={lang}
                mode={activeTab}
                services={services}
                projects={projects}
                offers={offers}
                onRefresh={onRefreshPublicData}
                getAuthToken={getFirebaseIdToken}
                isFirebaseAdmin={isFirebaseAdmin}
              />
            )}

            {(activeTab === 'homepage' || activeTab === 'company') && (
              <AdminSiteSettingsTab
                lang={lang}
                mode={activeTab}
                content={siteContent}
                onRefresh={onRefreshPublicData}
                getAuthToken={getFirebaseIdToken}
                isFirebaseAdmin={isFirebaseAdmin}
              />
            )}
          </main>
        </div>
      </div>

      {/* Password Rotation Modal */}
      {showPasswordModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rotate-password-title"
          className="fixed inset-0 z-50 bg-[#102116]/60 dark:bg-black/75 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="rotate-password-title" className="text-base font-extrabold text-[#102116] dark:text-[#ECF4EE]">
                {isAr ? 'تحديث كلمة مرور الإدارة في Firestore' : 'Update Firestore Admin Password'}
              </h2>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : 'Close'}
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#102116] dark:hover:text-[#ECF4EE] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rotateError && (
              <p className="p-2.5 bg-[#FEF2F2] dark:bg-[#2A1215] border border-[#FECACA] dark:border-[#5C2026] text-xs text-[#B91C1C] dark:text-[#FCA5A5] rounded-lg">
                {rotateError}
              </p>
            )}
            {rotateSuccess && (
              <p className="p-2.5 bg-[#F1F6F2] dark:bg-[#17281D] border border-[#0B5D27]/30 dark:border-[#7AD959]/30 text-xs font-semibold text-[#0B5D27] dark:text-[#7AD959] rounded-lg">
                {rotateSuccess}
              </p>
            )}

            <form onSubmit={handleRotatePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1">
                  {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7FAF7] dark:bg-[#0D1711] border border-[#DCE6DE] dark:border-[#213629] text-[#102116] dark:text-[#ECF4EE] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1">
                  {isAr ? 'كلمة المرور الجديدة (8+ أحرف)' : 'New Password (8+ characters)'}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7FAF7] dark:bg-[#0D1711] border border-[#DCE6DE] dark:border-[#213629] text-[#102116] dark:text-[#ECF4EE] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1">
                  {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7FAF7] dark:bg-[#0D1711] border border-[#DCE6DE] dark:border-[#213629] text-[#102116] dark:text-[#ECF4EE] rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#4B6152] dark:text-[#A3B9AA]"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={rotatingPassword}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D27] hover:bg-[#08431C] rounded-lg disabled:opacity-60"
                >
                  {rotatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isAr ? 'حفظ التحديث' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
