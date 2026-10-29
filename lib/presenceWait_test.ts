import { createPresenceWait } from "./presenceWait.ts";

function assert(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(message);
}

Deno.test("wait returns a cached presence immediately and resolves on a gateway update", async () => {
 const cache = new Map<string, string>([["cached", "online"]]);
 const presences = createPresenceWait(cache);
 assert(await presences.wait("cached") === "online", "Cached presence was not used");
 const first = presences.wait("new", 100);
 const second = presences.wait("new", 100);
 presences.update("new", "idle");
 assert(await first === "idle" && await second === "idle", "Waiters missed the update");
});

Deno.test("missing presence times out without preventing a later update", async () => {
 const cache = new Map<string, string>();
 const presences = createPresenceWait(cache);
 assert(await presences.wait("offline", 1) === undefined, "Missing presence should time out");
 presences.update("offline", "online");
 assert(await presences.wait("offline") === "online", "Late update was lost");
});
