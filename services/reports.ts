import { API_URL } from '../config/api';

export type ReportTargetType = 'message' | 'challenge' | 'user' | 'other';
export type ReportReason = 'harassment' | 'spam' | 'unsafe' | 'other';

export interface ContentReportInput {
  targetType: ReportTargetType;
  targetId?: string;
  reason: ReportReason;
  contextId?: string;
  notes?: string;
  organizationId?: string;
}

export async function submitContentReport(
  accessToken: string,
  report: ContentReportInput
): Promise<void> {
  const response = await fetch(`${API_URL}/api/users?resource=reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contentType: report.targetType === 'user' ? 'profile' : report.targetType,
      contentId: report.targetId,
      reason: report.reason,
      details:
        report.notes ||
        (report.contextId ? `Conversation context: ${report.contextId}` : undefined),
      organizationId: report.organizationId,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body && typeof body.error === 'string'
        ? body.error
        : 'Unable to submit this report right now.'
    );
  }
}
