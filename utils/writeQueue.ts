/** Coalesce writes in the same turn, serialize each key, and resolve after persistence. */
export function createWriteQueue() {
  type Job = { run: () => Promise<unknown>; resolve: (() => void)[]; reject: ((error: unknown) => void)[] };
  const pending = new Map<string, Job>();
  const running = new Set<string>();
  const outstanding = new Set<Promise<void>>();
  async function drain(key: string) {
    if (running.has(key)) return;
    running.add(key);
    try {
      while (pending.has(key)) {
        const job = pending.get(key)!;
        pending.delete(key);
        try { await job.run(); job.resolve.forEach(resolve => resolve()); }
        catch (error) { job.reject.forEach(reject => reject(error)); }
      }
    } finally { running.delete(key); }
  }
  return {
    enqueue(key: string, run: () => Promise<unknown>): Promise<void> {
      const promise = new Promise<void>((resolve, reject) => {
        const previous = pending.get(key);
        pending.set(key, { run, resolve: [...(previous?.resolve || []), resolve], reject: [...(previous?.reject || []), reject] });
      });
      outstanding.add(promise);
      promise.then(() => outstanding.delete(promise), () => outstanding.delete(promise));
      void Promise.resolve().then(() => drain(key));
      return promise;
    },
    async flush() {
      while (outstanding.size) await Promise.allSettled([...outstanding]);
    },
  };
}
