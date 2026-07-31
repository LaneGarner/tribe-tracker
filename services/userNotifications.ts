import { API_URL } from '../config/api';

export type UserNotificationType = 'access_requested' | 'member_joined' | 'challenge_started';

export interface UserNotification {
  id: string;
  organizationId?: string;
  type: UserNotificationType;
  title: string;
  body: string;
  linkPath?: string;
  readAt?: string;
  createdAt: string;
}

export interface UserNotificationPreferences {
  inAppEnabled: boolean;
}

async function request<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Notification request failed.');
  return payload as T;
}

function mapPreferences(value: any): UserNotificationPreferences {
  return {
    inAppEnabled: value?.in_app_enabled ?? true,
  };
}

export async function getUserNotifications(accessToken: string, page = 1, pageSize = 10) {
  const payload = await request<any>(
    accessToken,
    `/api/users?resource=notifications&page=${page}&pageSize=${pageSize}`
  );
  return {
    notifications: (payload.notifications || []).map((notification: any): UserNotification => ({
      id: notification.id,
      organizationId: notification.organization_id || undefined,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      linkPath: notification.link_path || undefined,
      readAt: notification.read_at || undefined,
      createdAt: notification.created_at,
    })),
    unreadCount: payload.unreadCount || 0,
    total: payload.total || 0,
    page: payload.page || page,
    pageSize: payload.pageSize || pageSize,
    preferences: mapPreferences(payload.preferences),
  };
}

export async function markUserNotificationRead(accessToken: string, id: string) {
  await request(accessToken, '/api/users?resource=notifications', {
    method: 'PUT',
    body: JSON.stringify({ action: 'mark_read', id }),
  });
}

export async function markAllUserNotificationsRead(accessToken: string) {
  await request(accessToken, '/api/users?resource=notifications', {
    method: 'PUT',
    body: JSON.stringify({ action: 'mark_all_read' }),
  });
}

export async function getUserNotificationPreferences(accessToken: string) {
  const payload = await request<any>(accessToken, '/api/users?resource=notification-preferences');
  return mapPreferences(payload.preferences);
}

export async function updateUserNotificationPreferences(
  accessToken: string,
  preferences: UserNotificationPreferences
) {
  const payload = await request<any>(accessToken, '/api/users?resource=notification-preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
  return mapPreferences(payload.preferences);
}
