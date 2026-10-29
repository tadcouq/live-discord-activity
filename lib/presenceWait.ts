/** Wait briefly for a gateway presence without holding up requests indefinitely. */
export function createPresenceWait<T>(cache: Map<string, T>) {
 const listeners = new Map<string, Set<(presence: T) => void>>();
 return {
  update(id: string, presence: T) {
   cache.set(id, presence);
   for (const listener of listeners.get(id) ?? []) listener(presence);
  },
  wait(id: string, timeout = 1500): Promise<T | undefined> {
   const cached = cache.get(id);
   if (cached) return Promise.resolve(cached);
   return new Promise((resolve) => {
    const timer = setTimeout(() => finish(), timeout);
    const finish = (presence?: T) => {
     clearTimeout(timer);
     listeners.get(id)?.delete(finish);
     if (!listeners.get(id)?.size) listeners.delete(id);
     resolve(presence);
    };
    const waiting = listeners.get(id) ?? new Set<(presence: T) => void>();
    waiting.add(finish);
    listeners.set(id, waiting);
   });
  },
 };
}
