import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  AdminCredentialRecord,
  createAdminCredentialRecord,
  fetchAdminCredentialRecord,
  updateAdminCredentialRecord,
} from '../lib/firestoreService';
import {
  AUTHORIZED_ADMIN_EMAIL,
  createAdminPasswordVerifier,
  isAuthorizedAdminEmail,
  normalizeAdminEmailInput,
  validateAdminPasswordStrength,
  verifyAdminPassword,
} from '../utils/passwordCrypto';

interface AdminAuthContextValue {
  authReady: boolean;
  user: User | null;
  isFirebaseAdmin: boolean;
  needsEmailVerification: boolean;
  unauthorizedEmail: string | null;
  checkingCredential: boolean;
  credentialRecord: AdminCredentialRecord | null;
  credentialExists: boolean | null;
  credentialLoadError: string | null;
  isVaultUnlocked: boolean;
  isFullyAuthenticatedAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithFirebaseEmail: (email: string, password: string) => Promise<void>;
  sendAdminVerificationEmail: () => Promise<void>;
  refreshFirebaseUser: () => Promise<void>;
  reloadCredentialRecord: () => Promise<void>;
  setupFirestorePassword: (email: string, password: string) => Promise<void>;
  verifyFirestorePassword: (email: string, password: string) => Promise<void>;
  rotateFirestorePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
  getFirebaseIdToken: () => Promise<string | null>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [checkingCredential, setCheckingCredential] = useState(false);
  const [credentialRecord, setCredentialRecord] = useState<AdminCredentialRecord | null>(null);
  const [credentialLoadError, setCredentialLoadError] = useState<string | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);

  const isFirebaseAdmin = Boolean(
    user && isAuthorizedAdminEmail(user.email) && user.emailVerified === true
  );
  const needsEmailVerification = Boolean(
    user && isAuthorizedAdminEmail(user.email) && user.emailVerified !== true
  );
  const unauthorizedEmail =
    user && !isAuthorizedAdminEmail(user.email) ? user.email || 'unknown' : null;

  const credentialExists =
    !isFirebaseAdmin || checkingCredential ? null : Boolean(credentialRecord);

  const loadCredential = useCallback(async (verifiedUser: User | null) => {
    if (!verifiedUser || !isAuthorizedAdminEmail(verifiedUser.email) || !verifiedUser.emailVerified) {
      setCredentialRecord(null);
      setCredentialLoadError(null);
      setCheckingCredential(false);
      return;
    }

    setCheckingCredential(true);
    setCredentialLoadError(null);
    try {
      const record = await fetchAdminCredentialRecord();
      setCredentialRecord(record);
    } catch (err) {
      setCredentialRecord(null);
      setCredentialLoadError(
        err instanceof Error ? err.message : 'Unable to read Firestore admin credentials.'
      );
    } finally {
      setCheckingCredential(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setIsVaultUnlocked(false);
      void loadCredential(nextUser);
    });
    return () => unsubscribe();
  }, [loadCredential]);

  const reloadCredentialRecord = useCallback(async () => {
    await loadCredential(auth.currentUser);
  }, [loadCredential]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithFirebaseEmail = useCallback(async (email: string, password: string) => {
    const normalized = normalizeAdminEmailInput(email);
    if (!isAuthorizedAdminEmail(normalized)) {
      const err = new Error(`Only the authorized admin email (${AUTHORIZED_ADMIN_EMAIL}) is permitted.`);
      (err as Error & { code?: string }).code = 'protec/unauthorized-email';
      throw err;
    }
    await signInWithEmailAndPassword(auth, normalized, password);
  }, []);

  const sendAdminVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('No signed-in Firebase user.');
    }
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshFirebaseUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    const refreshed = auth.currentUser;
    setUser(refreshed ? ({ ...refreshed } as User) : null);
    await loadCredential(auth.currentUser);
  }, [loadCredential]);

  const setupFirestorePassword = useCallback(
    async (email: string, password: string) => {
      if (!auth.currentUser || !isFirebaseAdmin) {
        throw new Error('Verified Firebase admin sign-in is required before setting credentials.');
      }
      const normalized = normalizeAdminEmailInput(email);
      if (!isAuthorizedAdminEmail(normalized)) {
        const err = new Error(`Email must match ${AUTHORIZED_ADMIN_EMAIL}.`);
        (err as Error & { code?: string }).code = 'protec/unauthorized-email';
        throw err;
      }
      const strength = validateAdminPasswordStrength(password);
      if (!strength.valid) {
        const err = new Error('Password must be between 8 and 128 characters.');
        (err as Error & { code?: string }).code = 'protec/weak-password';
        throw err;
      }

      const verifier = await createAdminPasswordVerifier(password);
      await createAdminCredentialRecord(AUTHORIZED_ADMIN_EMAIL, verifier);
      await loadCredential(auth.currentUser);
      setIsVaultUnlocked(true);
    },
    [isFirebaseAdmin, loadCredential]
  );

  const verifyFirestorePassword = useCallback(
    async (email: string, password: string) => {
      if (!auth.currentUser || !isFirebaseAdmin) {
        throw new Error('Verified Firebase admin sign-in is required.');
      }
      if (!credentialRecord) {
        throw new Error('Admin credentials are not initialized in Firestore yet.');
      }
      const normalized = normalizeAdminEmailInput(email);
      if (normalized !== normalizeAdminEmailInput(credentialRecord.email)) {
        const err = new Error('Invalid admin email.');
        (err as Error & { code?: string }).code = 'protec/invalid-credentials';
        throw err;
      }
      const valid = await verifyAdminPassword(password, credentialRecord);
      if (!valid) {
        const err = new Error('Invalid admin password.');
        (err as Error & { code?: string }).code = 'protec/invalid-credentials';
        throw err;
      }
      setIsVaultUnlocked(true);
    },
    [credentialRecord, isFirebaseAdmin]
  );

  const rotateFirestorePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!auth.currentUser || !isFirebaseAdmin || !credentialRecord) {
        throw new Error('Active authenticated admin session required.');
      }
      const matchesCurrent = await verifyAdminPassword(currentPassword, credentialRecord);
      if (!matchesCurrent) {
        const err = new Error('Current password is incorrect.');
        (err as Error & { code?: string }).code = 'protec/invalid-credentials';
        throw err;
      }
      const verifier = await createAdminPasswordVerifier(newPassword);
      await updateAdminCredentialRecord(verifier);
      await loadCredential(auth.currentUser);
    },
    [credentialRecord, isFirebaseAdmin, loadCredential]
  );

  const signOutAdmin = useCallback(async () => {
    setIsVaultUnlocked(false);
    setCredentialRecord(null);
    setCredentialLoadError(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  }, []);

  const getFirebaseIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser || !isFirebaseAdmin) {
      return null;
    }
    return auth.currentUser.getIdToken();
  }, [isFirebaseAdmin]);

  const isFullyAuthenticatedAdmin = authReady && isFirebaseAdmin && isVaultUnlocked;

  return (
    <AdminAuthContext.Provider
      value={{
        authReady,
        user,
        isFirebaseAdmin,
        needsEmailVerification,
        unauthorizedEmail,
        checkingCredential,
        credentialRecord,
        credentialExists,
        credentialLoadError,
        isVaultUnlocked,
        isFullyAuthenticatedAdmin,
        signInWithGoogle,
        signInWithFirebaseEmail,
        sendAdminVerificationEmail,
        refreshFirebaseUser,
        reloadCredentialRecord,
        setupFirestorePassword,
        verifyFirestorePassword,
        rotateFirestorePassword,
        signOutAdmin,
        getFirebaseIdToken,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}
