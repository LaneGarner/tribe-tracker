interface PollingOptions {
  run: () => Promise<unknown>;
  isActive: () => boolean;
  interval: () => number;
}

/** One request at a time, with foreground refresh and no timers after cleanup. */
export function startAdaptivePolling({ run, isActive, interval }: PollingOptions) {
  let stopped = false;
  let running = false;
  let queued = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (!stopped) timer = setTimeout(refresh, interval());
  };
  async function refresh() {
    if (timer) clearTimeout(timer);
    if (stopped) return;
    if (running) { queued = true; return; }
    if (!isActive()) { schedule(); return; }
    running = true;
    try { await run(); } catch { /* Requests expose errors through their own state. */ }
    finally {
      running = false;
      if (!stopped && queued) { queued = false; void refresh(); }
      else schedule();
    }
  }
  void refresh();
  return {
    refresh,
    stop() { stopped = true; queued = false; if (timer) clearTimeout(timer); },
  };
}
