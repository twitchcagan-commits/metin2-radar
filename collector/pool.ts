/**
 * Küçük eşzamanlılık havuzu. Kütüphane kurmuyoruz.
 * Tek bir işin hatası diğerlerini durdurmaz — her sonuç ayrı sarmalanır.
 */

export type Settled<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

export async function mapWithConcurrency<TIn, TOut>(
  items: readonly TIn[],
  limit: number,
  worker: (item: TIn, index: number) => Promise<TOut>,
): Promise<Settled<TOut>[]> {
  const results: Settled<TOut>[] = new Array(items.length);
  const width = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  async function run(): Promise<void> {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;

      const item = items[index];
      if (item === undefined) continue;

      try {
        results[index] = { ok: true, value: await worker(item, index) };
      } catch (error) {
        results[index] = {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }
  }

  await Promise.all(Array.from({ length: width }, run));
  return results;
}
