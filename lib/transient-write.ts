// Only use for idempotent writes. Never retry an insert or financial operation here.
export async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
 for (let attempt = 0; ; attempt++) {
  try { return await operation(); }
  catch (error) {
   const value = error as {status?: number; message?: string; name?: string};
   const transient = [502,503,504].includes(Number(value?.status)) ||
    /502|503|504|bad gateway|fetch failed|network error|timed?\s*out/i.test(String(value?.message || ''));
   if (attempt >= 1 || !transient) throw error;
   await new Promise(resolve => setTimeout(resolve, 150));
  }
 }
}
