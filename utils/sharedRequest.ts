// Share only requests currently in flight. Completed requests are never cached,
// so explicit refreshes always reach the server. Keys include the auth token.
const pending = new Map<string, Promise<unknown>>();
export function sharedRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const promise = Promise.resolve().then(request).finally(() => {
    if (pending.get(key) === promise) pending.delete(key);
  });
  pending.set(key, promise);
  return promise;
}
