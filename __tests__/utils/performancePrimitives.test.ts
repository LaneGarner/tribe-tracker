import { sharedRequest } from '../../utils/sharedRequest';
import { startAdaptivePolling } from '../../utils/adaptivePolling';
import { createWriteQueue } from '../../utils/writeQueue';
import { serializeMessageCache } from '../../utils/messageCache';
import { indexCheckinsByUser } from '../../utils/checkinIndex';

it('shares concurrent requests but never caches completed requests or crosses accounts', async () => {
  const request = jest.fn(async () => ['result']);
  const first = sharedRequest('user-a:checkins', request);
  expect(sharedRequest('user-a:checkins', request)).toBe(first);
  const other = sharedRequest('user-b:checkins', request);
  expect(other).not.toBe(first);
  await Promise.all([first, other]);
  await sharedRequest('user-a:checkins', request);
  expect(request).toHaveBeenCalledTimes(3);
});
it('retries after a shared request fails', async () => {
  await expect(sharedRequest('failed', async () => { throw new Error('Offline'); })).rejects.toThrow('Offline');
  await expect(sharedRequest('failed', async () => 'fresh')).resolves.toBe('fresh');
});
it('coalesces a burst into the newest durable write and flush waits for persistence', async () => {
  const queue = createWriteQueue();
  const writes: number[] = [];
  const first = queue.enqueue('messages', async () => { writes.push(1); });
  const second = queue.enqueue('messages', async () => { writes.push(2); });
  await queue.flush();
  await Promise.all([first, second]);
  expect(writes).toEqual([2]);
});
it('serializes writes so slow older writes cannot overwrite newer data', async () => {
  const queue = createWriteQueue();
  const writes: number[] = [];
  let release!: () => void;
  const first = queue.enqueue('messages', () => new Promise<void>(resolve => { release = () => { writes.push(1); resolve(); }; }));
  await Promise.resolve();
  const second = queue.enqueue('messages', async () => { writes.push(2); });
  release();
  await Promise.all([first, second]);
  expect(writes).toEqual([1, 2]);
});
it('does not let failed storage writes block later writes', async () => {
  const queue = createWriteQueue();
  await expect(queue.enqueue('messages', async () => { throw new Error('Disk'); })).rejects.toThrow('Disk');
  await expect(queue.enqueue('messages', async () => undefined)).resolves.toBeUndefined();
  await queue.flush();
});
it('reuses serialization for unchanged frozen conversations and retains the disk format', () => {
  const serialize = jest.fn(() => ({ id: 'old' }));
  const unchanged = Object.freeze([Object.freeze({ toJSON: serialize })]) as any;
  expect(JSON.parse(serializeMessageCache({ old: unchanged, new: [{ id: 'one' }] as any }))).toEqual({ old: [{ id: 'old' }], new: [{ id: 'one' }] });
  expect(JSON.parse(serializeMessageCache({ old: unchanged, new: [{ id: 'two' }] as any })).new).toEqual([{ id: 'two' }]);
  expect(serialize).toHaveBeenCalledTimes(1);
});
it('caps each message cache at 100 and does not cache mutable input arrays', () => {
  const messages = Array.from({ length: 105 }, (_, i) => ({ id: String(i) })) as any;
  const key = 'a"b';
  expect(JSON.parse(serializeMessageCache({ [key]: messages }))[key]).toHaveLength(100);
  messages.push({ id: 'latest' });
  const saved = JSON.parse(serializeMessageCache({ [key]: messages }))[key];
  expect(saved[saved.length - 1].id).toBe('latest');
});
it('indexes check-ins with the same dates and order as per-user scans', () => {
  const checkins = Array.from({ length: 1000 }, (_, i) => ({ userId: `u${i % 10}`, checkinDate: String(i) })) as any;
  const index = indexCheckinsByUser(checkins);
  for (const userId of index.keys()) expect(index.get(userId)).toEqual(checkins.filter((c: any) => c.userId === userId).map((c: any) => c.checkinDate));
});

describe('adaptive polling', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('backs off with healthy realtime, pauses in background, and refreshes on foreground', async () => {
    let healthy = false;
    let active = true;
    const run = jest.fn(async () => undefined);
    const polling = startAdaptivePolling({ run, isActive: () => active, interval: () => healthy ? 30000 : 5000 });
    expect(run).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(0);
    healthy = true;
    await jest.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(29999);
    expect(run).toHaveBeenCalledTimes(2);
    active = false;
    await jest.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    active = true;
    await polling.refresh();
    expect(run).toHaveBeenCalledTimes(3);
    polling.stop();
    await jest.advanceTimersByTimeAsync(60000);
    expect(run).toHaveBeenCalledTimes(3);
  });
  it('does not overlap slow polls or restart after cleanup', async () => {
    let resolve!: () => void;
    const run = jest.fn(() => new Promise<void>(done => { resolve = done; }));
    const polling = startAdaptivePolling({ run, isActive: () => true, interval: () => 5000 });
    await polling.refresh();
    await jest.advanceTimersByTimeAsync(15000);
    expect(run).toHaveBeenCalledTimes(1);
    polling.stop(); resolve();
    await jest.advanceTimersByTimeAsync(60000);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
