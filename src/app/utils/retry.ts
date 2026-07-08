// Retry helpers for long-running network work (imports, image uploads) over
// unreliable connections: slow networks, blackouts and intermittent
// connectivity are the norm for this app's users, so a dropped request should
// be retried once the connection recovers instead of failing the whole task.

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Resolves when the browser regains connectivity, or after `maxWaitMs` as a
 * safety valve (navigator.onLine is not always reliable). Resolves
 * immediately when the browser already reports being online.
 */
export function waitForOnline(maxWaitMs = 60000): Promise<void> {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('online', done);
      resolve();
    };
    const timer = setTimeout(done, maxWaitMs);
    window.addEventListener('online', done);
  });
}

/**
 * AbortSignal that fires after `ms`, so a request stuck on a dying connection
 * fails fast (and can be retried) instead of hanging for minutes. Returns
 * undefined on older browsers without AbortSignal.timeout.
 */
export function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

/**
 * Runs `fn` up to `attempts` times with exponential backoff, waiting for
 * connectivity to come back before each retry. Only use with operations that
 * are safe to repeat (idempotent upserts, image uploads).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 4, baseDelayMs = 1200 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await sleep(baseDelayMs * 2 ** (attempt - 1));
      await waitForOnline();
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
