import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useMembership } from './MembershipContext';
import {
  AIConsentPurpose,
  fetchAIConsents,
  updateAIConsent,
} from '../services/aiConsent';

const CONSENT_VERSION = 'ai-wellness-v1';

interface AIConsentContextValue {
  hasAIConsent: (purpose: AIConsentPurpose) => boolean;
  isLoading: boolean;
  grantAIConsent: (purpose: AIConsentPurpose) => Promise<void>;
  revokeAIConsent: (purpose: AIConsentPurpose) => Promise<void>;
  ensureAIConsent: (purpose: AIConsentPurpose) => Promise<boolean>;
}

const AIConsentContext = createContext<AIConsentContextValue | undefined>(
  undefined
);

export function AIConsentProvider({ children }: { children: React.ReactNode }) {
  const { user, getAccessToken } = useAuth();
  const { refreshMembership } = useMembership();
  const [grantedPurposes, setGrantedPurposes] = useState<
    Set<AIConsentPurpose>
  >(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!user || !token) {
      setGrantedPurposes(new Set());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const records = await fetchAIConsents(token);
      setGrantedPurposes(
        new Set(
          records
            .filter(record => record.granted)
            .map(record => record.purpose)
        )
      );
    } catch {
      setGrantedPurposes(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, user]);

  useEffect(() => {
    refresh();
  }, [refresh, user?.id]);

  const setConsent = useCallback(
    async (purpose: AIConsentPurpose, granted: boolean) => {
      const token = getAccessToken();
      if (!token) throw new Error('Sign in to update AI consent.');
      await updateAIConsent(token, purpose, granted, CONSENT_VERSION);
      setGrantedPurposes(current => {
        const next = new Set(current);
        if (granted) next.add(purpose);
        else next.delete(purpose);
        return next;
      });
      await refreshMembership();
    },
    [getAccessToken, refreshMembership]
  );

  const grantAIConsent = useCallback(
    (purpose: AIConsentPurpose) => setConsent(purpose, true),
    [setConsent]
  );
  const revokeAIConsent = useCallback(
    (purpose: AIConsentPurpose) => setConsent(purpose, false),
    [setConsent]
  );
  const hasAIConsent = useCallback(
    (purpose: AIConsentPurpose) => grantedPurposes.has(purpose),
    [grantedPurposes]
  );

  const ensureAIConsent = useCallback(
    async (purpose: AIConsentPurpose) => {
      if (hasAIConsent(purpose)) return true;
      return new Promise<boolean>(resolve => {
        Alert.alert(
          'Allow AI-assisted guidance?',
          'TribeTracker will send the goals, challenge details, check-ins, and streak information needed for this feature to a third-party AI provider. Chat messages are not included. This is general wellness support, not medical treatment.',
          [
            { text: 'Not Now', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Allow',
              onPress: async () => {
                try {
                  await grantAIConsent(purpose);
                  resolve(true);
                } catch (error) {
                  Alert.alert(
                    'Unable to Save Consent',
                    error instanceof Error ? error.message : 'Please try again.'
                  );
                  resolve(false);
                }
              },
            },
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        );
      });
    },
    [grantAIConsent, hasAIConsent]
  );

  const value = useMemo(
    () => ({
      hasAIConsent,
      isLoading,
      grantAIConsent,
      revokeAIConsent,
      ensureAIConsent,
    }),
    [
      hasAIConsent,
      isLoading,
      grantAIConsent,
      revokeAIConsent,
      ensureAIConsent,
    ]
  );

  return (
    <AIConsentContext.Provider value={value}>
      {children}
    </AIConsentContext.Provider>
  );
}

export function useAIConsent() {
  const context = useContext(AIConsentContext);
  if (!context) {
    throw new Error('useAIConsent must be used within AIConsentProvider');
  }
  return context;
}
