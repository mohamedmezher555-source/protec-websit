import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Language } from '../../types';
import { AUTHORIZED_ADMIN_EMAIL } from '../../utils/passwordCrypto';

interface AdminLoginPageProps {
  lang: Language;
  onBackToSite: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ lang, onBackToSite }) => {
  const isAr = lang === 'ar';
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const {
    authReady,
    isFirebaseAdmin,
    needsEmailVerification,
    unauthorizedEmail,
    checkingCredential,
    credentialExists,
    credentialLoadError,
    signInWithGoogle,
    signInWithFirebaseEmail,
    sendAdminVerificationEmail,
    refreshFirebaseUser,
    reloadCredentialRecord,
    setupFirestorePassword,
    verifyFirestorePassword,
    signOutAdmin,
  } = useAdminAuth();

  // Firebase Email/Password sign-in fields (Step 1)
  const [fbEmail, setFbEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [fbPassword, setFbPassword] = useState('');
  const [showFbPassword, setShowFbPassword] = useState(false);
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [emailProviderDisabledHint, setEmailProviderDisabledHint] = useState(false);

  // Verification email state
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Firestore password setup / verification fields (Step 2)
  const [vaultEmail, setVaultEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultConfirmPassword, setVaultConfirmPassword] = useState('');
  const [showVaultPassword, setShowVaultPassword] = useState(false);
  const [vaultSubmitting, setVaultSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!authReady || (isFirebaseAdmin && checkingCredential)) {
    return (
      <div className="min-h-[80vh] bg-[#F7FAF7] dark:bg-[#09110C] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#4B6152] dark:text-[#A3B9AA]">
          <Loader2 className="w-5 h-5 animate-spin text-[#0B5D27] dark:text-[#7AD959]" aria-hidden="true" />
          <span>
            {isAr
              ? 'جاري التحقق من جلسة Firebase والصلاحيات...'
              : 'Verifying Firebase authentication & admin credentials...'}
          </span>
        </div>
      </div>
    );
  }

  // Case A: Signed into Firebase with a non-admin email
  if (unauthorizedEmail) {
    return (
      <div className="min-h-[80vh] bg-[#F7FAF7] dark:bg-[#09110C] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#111E16] border border-[#FECACA] dark:border-[#7F1D1D] rounded-2xl p-8 text-center">
          <AlertTriangle className="w-11 h-11 text-[#B91C1C] dark:text-[#FCA5A5] mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-xl font-extrabold text-[#B91C1C] dark:text-[#FCA5A5] mb-2">
            {isAr ? 'حساب غير مصرح له' : 'Unauthorized Account'}
          </h1>
          <p className="text-sm text-[#4B6152] dark:text-[#A3B9AA] mb-6 leading-relaxed">
            {isAr
              ? `الحساب الحالي (${unauthorizedEmail}) لا يملك صلاحيات إدارة Protec. حساب الإدارة المعتمد هو ${AUTHORIZED_ADMIN_EMAIL}.`
              : `The signed-in account (${unauthorizedEmail}) is not authorized for Protec Admin access. Please sign in with ${AUTHORIZED_ADMIN_EMAIL}.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              className="px-4 py-2.5 bg-[#0B5D27] hover:bg-[#08431C] text-white text-xs font-bold rounded-lg min-h-[42px] whitespace-nowrap"
            >
              {isAr ? 'تبديل الحساب' : 'Switch Account'}
            </button>
            <button
              type="button"
              onClick={onBackToSite}
              className="px-4 py-2.5 bg-[#F1F6F2] dark:bg-[#14241A] hover:bg-[#E2EDE5] dark:hover:bg-[#1C3224] text-[#102116] dark:text-[#ECF4EE] text-xs font-semibold rounded-lg min-h-[42px] whitespace-nowrap"
            >
              {isAr ? 'العودة للموقع' : 'Back to Site'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case B: Signed into Firebase as admin email, but email is not yet verified
  if (needsEmailVerification) {
    return (
      <div className="min-h-[80vh] bg-[#F7FAF7] dark:bg-[#09110C] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-2xl p-8 text-center">
          <MailCheck className="w-11 h-11 text-[#0B5D27] dark:text-[#7AD959] mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-xl font-extrabold text-[#102116] dark:text-[#ECF4EE] mb-2">
            {isAr ? 'تأكيد البريد الإلكتروني مطلوب' : 'Email Verification Required'}
          </h1>
          <p className="text-sm text-[#4B6152] dark:text-[#A3B9AA] mb-5 leading-relaxed">
            {isAr
              ? `تم تسجيل الدخول بالحساب (${AUTHORIZED_ADMIN_EMAIL}) ولكن يلزم تأكيد البريد الإلكتروني للوصول إلى لوحة التحكم وقواعد الأمان.`
              : `Signed in as ${AUTHORIZED_ADMIN_EMAIL}, but Firebase email verification is required before accessing admin records.`}
          </p>

          {verificationSent && (
            <div className="mb-4 p-3 bg-[#F1F6F2] dark:bg-[#14241A] border border-[#0B5D27]/30 dark:border-[#65B32E]/40 text-xs font-semibold text-[#0B5D27] dark:text-[#7AD959] rounded-lg">
              {isAr
                ? 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني. بعد الضغط على الرابط اضغط "تحديث الحالة".'
                : 'Verification link sent. After confirming in your inbox, click Refresh Status.'}
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#2A1215] border border-[#FECACA] dark:border-[#7F1D1D] text-xs text-[#B91C1C] dark:text-[#FCA5A5] rounded-lg"
            >
              {errorMsg}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={sendingVerification}
              onClick={async () => {
                setErrorMsg(null);
                setSendingVerification(true);
                try {
                  await sendAdminVerificationEmail();
                  setVerificationSent(true);
                } catch (err) {
                  setErrorMsg(err instanceof Error ? err.message : 'Could not send email.');
                } finally {
                  setSendingVerification(false);
                }
              }}
              className="w-full py-2.5 px-4 bg-[#0B5D27] hover:bg-[#08431C] text-white text-xs font-bold rounded-lg min-h-[42px]"
            >
              {isAr ? 'إرسال رابط تأكيد البريد' : 'Send Verification Email'}
            </button>
            <button
              type="button"
              onClick={() => void refreshFirebaseUser()}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F1F6F2] dark:bg-[#14241A] hover:bg-[#E2EDE5] dark:hover:bg-[#1C3224] text-[#0B5D27] dark:text-[#7AD959] text-xs font-bold rounded-lg min-h-[42px]"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAr ? 'تحديث حالة التأكيد' : 'Refresh Verification Status'}</span>
            </button>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              className="w-full py-2 text-xs font-semibold text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#102116] dark:hover:text-[#ECF4EE]"
            >
              {isAr ? 'تسجيل الخروج' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case C: Firebase Admin Verified -> Step 2: Set or Verify Secure Admin Password stored in Firestore
  if (isFirebaseAdmin) {
    if (credentialLoadError) {
      return (
        <div className="min-h-[80vh] bg-[#F7FAF7] dark:bg-[#09110C] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#111E16] border border-[#FECACA] dark:border-[#7F1D1D] rounded-2xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-[#B91C1C] dark:text-[#FCA5A5] mx-auto mb-3" aria-hidden="true" />
            <h1 className="text-lg font-extrabold text-[#102116] dark:text-[#ECF4EE] mb-2">
              {isAr ? 'تعذر قراءة بيانات الاعتماد من Firestore' : 'Unable to Load Firestore Credentials'}
            </h1>
            <p className="text-xs text-[#4B6152] dark:text-[#A3B9AA] mb-5 break-words">{credentialLoadError}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void reloadCredentialRecord()}
                className="px-4 py-2.5 bg-[#0B5D27] text-white text-xs font-bold rounded-lg"
              >
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </button>
              <button
                type="button"
                onClick={() => void signOutAdmin()}
                className="px-4 py-2.5 bg-[#F1F6F2] dark:bg-[#14241A] text-[#102116] dark:text-[#ECF4EE] text-xs font-semibold rounded-lg"
              >
                {isAr ? 'خروج' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isFirstTimeSetup = credentialExists === false;

    const handleVaultSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);

      if (!vaultPassword) {
        setErrorMsg(isAr ? 'يرجى إدخال كلمة مرور الإدارة.' : 'Please enter the admin password.');
        return;
      }

      if (isFirstTimeSetup) {
        if (vaultPassword.length < 8) {
          setErrorMsg(
            isAr ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.' : 'Password must be at least 8 characters.'
          );
          return;
        }
        if (vaultPassword !== vaultConfirmPassword) {
          setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
          return;
        }
      }

      setVaultSubmitting(true);
      try {
        if (isFirstTimeSetup) {
          await setupFirestorePassword(vaultEmail, vaultPassword);
        } else {
          await verifyFirestorePassword(vaultEmail, vaultPassword);
        }
        setVaultPassword('');
        setVaultConfirmPassword('');
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === 'protec/unauthorized-email') {
          setErrorMsg(
            isAr
              ? `يجب استخدام البريد الإلكتروني المعتمد: ${AUTHORIZED_ADMIN_EMAIL}`
              : `Email must match the authorized admin email: ${AUTHORIZED_ADMIN_EMAIL}`
          );
        } else if (code === 'protec/invalid-credentials') {
          setErrorMsg(
            isAr
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
              : 'Invalid admin email or password.'
          );
        } else {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : isAr
                ? 'تعذر التحقق من بيانات الإدارة.'
                : 'Unable to verify admin credentials.'
          );
        }
      } finally {
        setVaultSubmitting(false);
      }
    };

    return (
      <div className="min-h-[80vh] bg-[#F7FAF7] dark:bg-[#09110C] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-2xl p-7 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[#EDF2EE] dark:border-[#1E3326]">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#0B5D27] dark:text-[#7AD959]">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span dir="ltr">{AUTHORIZED_ADMIN_EMAIL}</span>
            </div>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] dark:text-[#FCA5A5] hover:underline whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAr ? 'خروج' : 'Sign Out'}</span>
            </button>
          </div>

          <div className="text-center mb-6">
            <KeyRound className="w-10 h-10 text-[#0B5D27] dark:text-[#7AD959] mx-auto mb-2.5" aria-hidden="true" />
            <h1 className="text-xl font-extrabold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
              {isFirstTimeSetup
                ? isAr
                  ? 'تعيين كلمة مرور الإدارة في Firestore'
                  : 'Set Firestore Admin Password'
                : isAr
                  ? 'تأكيد كلمة مرور الإدارة'
                  : 'Verify Admin Password'}
            </h1>
            <p className="text-xs sm:text-sm text-[#4B6152] dark:text-[#A3B9AA] leading-relaxed">
              {isFirstTimeSetup
                ? isAr
                  ? 'تم التحقق من حساب Firebase. قم بتعيين كلمة مرور مشفرة (PBKDF2-SHA256) تُحفظ في Firestore لحماية تعديلات المحتوى والخدمات والعروض.'
                  : 'Firebase Auth verified. Set a salted PBKDF2-SHA256 password stored in Firestore to protect Admin Dashboard edits.'
                : isAr
                  ? 'أدخل البريد الإلكتروني وكلمة مرور الإدارة المحفوظة في Firestore لفتح لوحة التحكم.'
                  : 'Enter your admin email and Firestore-verified password to unlock the Admin Dashboard.'}
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#2A1215] border border-[#FECACA] dark:border-[#7F1D1D] text-xs text-[#B91C1C] dark:text-[#FCA5A5] rounded-lg"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleVaultSubmit} className="space-y-4">
            <div>
              <label htmlFor="vault-admin-email" className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
                {isAr ? 'البريد الإلكتروني للإدارة' : 'Admin Email'}
              </label>
              <input
                id="vault-admin-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                value={vaultEmail}
                onChange={(e) => setVaultEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7FAF7] dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
              />
            </div>

            <div>
              <label
                htmlFor="vault-admin-password"
                className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1.5"
              >
                {isFirstTimeSetup
                  ? isAr
                    ? 'كلمة المرور الجديدة (8 أحرف على الأقل)'
                    : 'New Admin Password (min 8 characters)'
                  : isAr
                    ? 'كلمة المرور'
                    : 'Password'}
              </label>
              <div className="relative">
                <input
                  id="vault-admin-password"
                  type={showVaultPassword ? 'text' : 'password'}
                  dir="ltr"
                  autoComplete={isFirstTimeSetup ? 'new-password' : 'current-password'}
                  required
                  minLength={isFirstTimeSetup ? 8 : 1}
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-3.5 pe-10 py-2.5 bg-[#F7FAF7] dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowVaultPassword((prev) => !prev)}
                  aria-label={showVaultPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 end-0 px-3 flex items-center text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#102116] dark:hover:text-[#ECF4EE]"
                >
                  {showVaultPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isFirstTimeSetup && (
              <div>
                <label
                  htmlFor="vault-admin-confirm"
                  className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1.5"
                >
                  {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <input
                  id="vault-admin-confirm"
                  type={showVaultPassword ? 'text' : 'password'}
                  dir="ltr"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={vaultConfirmPassword}
                  onChange={(e) => setVaultConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#F7FAF7] dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={vaultSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#0B5D27] hover:bg-[#08431C] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors min-h-[46px]"
            >
              {vaultSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lock className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {isFirstTimeSetup
                  ? isAr
                    ? 'حفظ كلمة المرور في Firestore والدخول'
                    : 'Save Admin Password & Enter'
                  : isAr
                    ? 'فتح لوحة التحكم'
                    : 'Unlock Admin Dashboard'}
              </span>
            </button>
          </form>

          <div className="text-center mt-5">
            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#102116] dark:hover:text-[#ECF4EE] py-2"
            >
              <BackArrow className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAr ? 'العودة إلى الموقع العام' : 'Return to Public Site'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case D: Unauthenticated -> Step 1: Firebase Authentication (Google Popup + Firebase Email/Password)
  const handleFirebaseEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setEmailProviderDisabledHint(false);

    if (!fbEmail.trim() || !fbPassword) {
      setErrorMsg(
        isAr
          ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
          : 'Please enter your admin email and password.'
      );
      return;
    }

    setFbSubmitting(true);
    try {
      await signInWithFirebaseEmail(fbEmail, fbPassword);
      setFbPassword('');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setEmailProviderDisabledHint(true);
        setErrorMsg(
          isAr
            ? 'تسجيل الدخول بالبريد وكلمة المرور غير مفعل بعد في Firebase Console. يمكنك استخدام زر Google المعتمد أدناه فوراً أو تفعيل Email/Password من إعدادات Firebase.'
            : 'Firebase Email/Password sign-in is not yet enabled in Firebase Console. Sign in with Google below right now or enable Email/Password in Firebase Authentication.'
        );
      } else if (code === 'protec/unauthorized-email') {
        setErrorMsg(
          isAr
            ? `هذا الدخول مخصص لحساب الإدارة المعتمد فقط (${AUTHORIZED_ADMIN_EMAIL}).`
            : `Admin access is restricted to ${AUTHORIZED_ADMIN_EMAIL}.`
        );
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setErrorMsg(
          isAr
            ? 'بيانات حساب Firebase غير صحيحة. يمكنك أيضاً تسجيل الدخول بحساب Google المعتمد.'
            : 'Invalid Firebase Email/Password credentials. You can also sign in with Google below.'
        );
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Firebase Authentication failed.');
      }
    } finally {
      setFbSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isAr
            ? 'تعذر تسجيل الدخول عبر Google.'
            : 'Google Sign-In failed.'
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#F7FAF7] dark:bg-[#09110C] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-[#111E16] border border-[#DCE6DE] dark:border-[#213629] rounded-2xl p-7 sm:p-8">
        <div className="text-center mb-6">
          <ShieldCheck className="w-11 h-11 text-[#0B5D27] dark:text-[#7AD959] mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-xl font-extrabold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
            {isAr ? 'تسجيل دخول إدارة Protec' : 'Protec Admin Login'}
          </h1>
          <p className="text-xs sm:text-sm text-[#4B6152] dark:text-[#A3B9AA] leading-relaxed">
            {isAr
              ? 'لوحة التحكم محمية بمصادقة Firebase والتحقق من كلمة مرور الإدارة في Firestore.'
              : 'Admin access is gated by Firebase Authentication and Firestore-verified admin credentials.'}
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#2A1215] border border-[#FECACA] dark:border-[#7F1D1D] text-xs text-[#B91C1C] dark:text-[#FCA5A5] rounded-lg leading-relaxed"
          >
            {errorMsg}
          </div>
        )}

        {emailProviderDisabledHint && (
          <div className="mb-4 p-3.5 bg-[#F1F6F2] dark:bg-[#14241A] border border-[#DCE6DE] dark:border-[#243D2D] text-xs text-[#102116] dark:text-[#ECF4EE] rounded-lg space-y-1.5">
            <p className="font-bold text-[#0B5D27] dark:text-[#7AD959]">
              {isAr
                ? 'خطوات تفعيل Email/Password في Firebase Console:'
                : 'How to enable Email/Password in Firebase Console:'}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[#4B6152] dark:text-[#A3B9AA]">
              <li>
                {isAr
                  ? 'افتح Firebase Console -> Authentication -> Sign-in method.'
                  : 'Open Firebase Console -> Authentication -> Sign-in method.'}
              </li>
              <li>
                {isAr
                  ? 'فعّل مزود Email/Password وأضف المستخدم المعتمد.'
                  : 'Enable the Email/Password provider and add the authorized admin user.'}
              </li>
              <li>
                {isAr
                  ? 'أو استخدم زر تسجيل الدخول بحساب Google المعتمد أدناه مباشرة.'
                  : 'Or use Sign in with Google below immediately.'}
              </li>
            </ol>
          </div>
        )}

        <button
          type="button"
          disabled={googleSubmitting}
          onClick={() => void handleGoogleLogin()}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#0B5D27] hover:bg-[#08431C] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors min-h-[46px]"
        >
          {googleSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          )}
          <span>
            {isAr
              ? 'تسجيل الدخول بحساب Google (Firebase)'
              : 'Sign In with Google (Firebase Auth)'}
          </span>
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-[#4B6152] dark:text-[#A3B9AA]">
          <span className="h-px flex-1 bg-[#DCE6DE] dark:bg-[#213629]" />
          <span>{isAr ? 'أو بالبريد وكلمة المرور (Firebase)' : 'or Email & Password'}</span>
          <span className="h-px flex-1 bg-[#DCE6DE] dark:bg-[#213629]" />
        </div>

        <form onSubmit={handleFirebaseEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="firebase-admin-email" className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1.5">
              {isAr ? 'البريد الإلكتروني المعتمد' : 'Authorized Admin Email'}
            </label>
            <input
              id="firebase-admin-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              value={fbEmail}
              onChange={(e) => setFbEmail(e.target.value)}
              placeholder={AUTHORIZED_ADMIN_EMAIL}
              className="w-full px-3.5 py-2.5 bg-[#F7FAF7] dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor="firebase-admin-password"
              className="block text-xs font-bold text-[#102116] dark:text-[#ECF4EE] mb-1.5"
            >
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <input
                id="firebase-admin-password"
                type={showFbPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                required
                value={fbPassword}
                onChange={(e) => setFbPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full ps-3.5 pe-10 py-2.5 bg-[#F7FAF7] dark:bg-[#0B150E] border border-[#DCE6DE] dark:border-[#243D2D] rounded-lg text-sm text-[#102116] dark:text-[#ECF4EE] focus:outline-none focus:border-[#0B5D27] dark:focus:border-[#65B32E] min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowFbPassword((prev) => !prev)}
                aria-label={showFbPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 end-0 px-3 flex items-center text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#102116] dark:hover:text-[#ECF4EE]"
              >
                {showFbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={fbSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F1F6F2] dark:bg-[#14241A] hover:bg-[#E2EDE5] dark:hover:bg-[#1C3224] disabled:opacity-60 text-[#0B5D27] dark:text-[#7AD959] border border-[#DCE6DE] dark:border-[#243D2D] text-xs font-bold rounded-lg transition-colors min-h-[44px]"
          >
            {fbSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Lock className="w-4 h-4" aria-hidden="true" />
            )}
            <span>
              {isAr ? 'دخول بالبريد الإلكتروني (Firebase)' : 'Sign In with Email & Password'}
            </span>
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B6152] dark:text-[#A3B9AA] hover:text-[#102116] dark:hover:text-[#ECF4EE] py-2"
          >
            <BackArrow className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAr ? 'العودة إلى الموقع العام' : 'Return to Public Site'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
