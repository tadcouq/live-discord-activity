/** Bounded, process-local cache. Concurrent callers share one load; failures are retried. */
export function createAsyncCache<T>({ ttl, maxEntries, maxWeight = Infinity, weight = () => 1, cacheable = () => true, now = Date.now }: {
 ttl: number;
 maxEntries: number;
 maxWeight?: number;
 weight?: (value: T) => number;
 cacheable?: (value: T) => boolean;
 now?: () => number;
}) {
 const entries = new Map<string, { value: T; expires: number; weight: number }>();
 const pending = new Map<string, Promise<T>>();
 let totalWeight = 0;
 const remove = (key: string) => {
  totalWeight -= entries.get(key)?.weight ?? 0;
  entries.delete(key);
 };
 const get = (key: string, loader: () => Promise<T>): Promise<T> => {
  const cached = entries.get(key);
  if (cached && cached.expires > now()) {
   entries.delete(key);
   entries.set(key, cached);
   return Promise.resolve(cached.value);
  }
  if (cached) remove(key);
  const loading = pending.get(key);
  if (loading) return loading;
  const promise = Promise.resolve().then(loader).then((value) => {
   const size = weight(value);
   if (pending.get(key) === promise && cacheable(value) && size <= maxWeight) {
    for (const [entryKey, entry] of entries) if (entry.expires <= now()) remove(entryKey);
    remove(key);
    while (entries.size && (entries.size >= maxEntries || totalWeight + size > maxWeight)) remove(entries.keys().next().value!);
    entries.set(key, { value, expires: now() + ttl, weight: size });
    totalWeight += size;
   }
   return value;
  }).finally(() => {
   if (pending.get(key) === promise) pending.delete(key);
  });
  if (pending.size < maxEntries) pending.set(key, promise);
  return promise;
 };
 return Object.assign(get, {
  delete: (key: string) => {
   remove(key);
   pending.delete(key);
  },
 });
}
