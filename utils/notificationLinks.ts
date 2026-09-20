export type NotificationLink =
  | { kind: 'external'; url: string }
  | { kind: 'internal'; path: string };

export function resolveNotificationLink(value: string): NotificationLink {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return { kind: 'external', url: url.toString() };
    }
  } catch {
    // Treat ordinary relative values as in-app paths.
  }
  return { kind: 'internal', path: value.startsWith('/') ? value : `/${value}` };
}
