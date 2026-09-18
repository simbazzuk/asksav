export class AskSavTimeoutError extends Error {
  stage: string;
  timeoutMs: number;

  constructor(stage: string, timeoutMs: number) {
    super(`${stage} timed out after ${timeoutMs}ms`);
    this.name = "AskSavTimeoutError";
    this.stage = stage;
    this.timeoutMs = timeoutMs;
  }
}

export async function withAskSavTimeout<T>(
  stage: string,
  work: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  console.info(`[AskSAV timing] ${stage} started`);

  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new AskSavTimeoutError(stage, timeoutMs)),
        timeoutMs,
      );
    });

    const value = await Promise.race([work(), timeout]);

    console.info(
      `[AskSAV timing] ${stage} completed in ${Date.now() - started}ms`,
    );

    return value;
  } catch (error) {
    console.error(
      `[AskSAV timing] ${stage} failed after ${Date.now() - started}ms`,
      error,
    );
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isAskSavTimeoutError(error: unknown): error is AskSavTimeoutError {
  return error instanceof AskSavTimeoutError;
}
