import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  ReportReason,
  ReportTargetType,
  submitContentReport,
} from '../services/reports';

interface ReportTarget {
  targetType: ReportTargetType;
  targetId?: string;
  contextId?: string;
  notes?: string;
}

const REASONS: Array<{ label: string; value: ReportReason }> = [
  { label: 'Harassment or bullying', value: 'harassment' },
  { label: 'Spam or misleading content', value: 'spam' },
  { label: 'Unsafe or inappropriate content', value: 'unsafe' },
  { label: 'Something else', value: 'other' },
];

export function useContentReport() {
  const { getAccessToken } = useAuth();

  const submit = async (target: ReportTarget, reason: ReportReason) => {
    const token = getAccessToken();
    if (!token) {
      Alert.alert('Sign In Required', 'Please sign in to submit a report.');
      return;
    }

    try {
      await submitContentReport(token, { ...target, reason });
      Alert.alert(
        'Report Submitted',
        'Thank you. TribeTracker will review this report.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to Submit',
        error instanceof Error
          ? error.message
          : 'Unable to submit this report right now.'
      );
    }
  };

  const reportContent = (target: ReportTarget) => {
    Alert.alert(
      'Report Content',
      'Why are you reporting this?',
      [
        ...REASONS.map(reason => ({
          text: reason.label,
          onPress: () => submit(target, reason.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  return { reportContent };
}
