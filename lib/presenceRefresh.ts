import { createAsyncCache } from "./asyncCache.ts";

/** Presence refresh is best-effort background work, never part of image latency. */
export function createPresenceRefresh(send: (id: string) => Promise<unknown>, hasPresence: (id: string) => boolean, onError: (error: unknown) => void) {
 const requests = createAsyncCache<boolean>({ ttl: 30_000, maxEntries: 512 });
 return (id: string): void => {
  if (hasPresence(id)) return;
  void requests(id, async () => {
   await send(id);
   return true;
  }).catch(onError);
 };
}
