import { buildUserData } from "./buildUserData.ts";
import { findMemberProfile, type MemberProfile } from "./memberProfiles.ts";
import { cardOptions } from "./schemas.ts";
import { generateCard } from "./generateCard.ts";
import { createAsyncCache } from "./asyncCache.ts";
import type { DiscordPresenceUpdate } from "npm:@discordeno/types@20.0.0";

function assert(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(message);
}

const profile = { id: 544164729354977282n, username: "offline-member", globalName: "Offline Member", bot: false, discriminator: "0" } as MemberProfile;

Deno.test("verified offline member without any presence receives a normal profile and SVG", async () => {
 const member = await findMemberProfile(() => Promise.resolve(profile));
 assert(member, "Offline member rejected");
 const user = buildUserData(member);
 assert(user && user.username === "Offline Member", "Missing offline profile");
 assert(user.status.desktop === "offline" && user.activities.length === 0, "Wrong offline fallback");
 assert(user.customStatus.state === null && user.customStatus.image === null, "Unexpected custom status");
 const svg = await generateCard(user, cardOptions.parse({ hideProfile: "true", idleMessage: "Offline right now" }));
 assert(svg.includes("Offline right now") && !svg.includes("User not found"), "Offline card failed");
});

Deno.test("missing client_status is safe; mobile presence and activity remain intact", () => {
 const offline = buildUserData(profile, { status: "offline", activities: [] } as unknown as DiscordPresenceUpdate);
 assert(offline?.status.desktop === "offline", "Missing client_status crashed");
 const presence = { status: "online", client_status: { mobile: "online" }, activities: [{ name: "Game", type: 0 }] } as unknown as DiscordPresenceUpdate;
 const online = buildUserData(profile, presence);
 assert(online?.status.mobile === "online" && !online.status.desktop, "Mobile status masked by offline fallback");
 assert(online.activities[0].name === "Game", "Online activities lost");
 const fallback = buildUserData(profile, { status: "idle", activities: [] } as unknown as DiscordPresenceUpdate);
 assert(fallback?.status.desktop === "idle", "Overall presence status ignored");
});

Deno.test("only Unknown Member becomes not found; permission and network failures propagate", async () => {
 const absent = await findMemberProfile(() => Promise.reject({ status: 404, body: JSON.stringify({ code: 10007, message: "Unknown Member" }) }));
 assert(absent === null, "Nonmember accepted");
 for (const error of [{ status: 403, body: '{"code":50001}' }, { status: 404, body: '{"code":10004}' }, { status: 429 }, new Error("Network failure")]) {
  let caught: unknown;
  try {
   await findMemberProfile(() => Promise.reject(error));
  } catch (value) {
   caught = value;
  }
  assert(caught === error, "Upstream error was hidden as user not found");
 }
});

Deno.test("membership invalidation prevents reuse of a removed member including in-flight cache writes", async () => {
 const cache = createAsyncCache<MemberProfile | null>({ ttl: 30_000, maxEntries: 10, cacheable: Boolean });
 await cache("guild:user", () => Promise.resolve(profile));
 cache.delete("guild:user");
 assert(await cache("guild:user", () => Promise.resolve(null)) === null, "Removed member still cached");
 let release!: (profile: MemberProfile) => void;
 const pending = cache("guild:user", () => new Promise<MemberProfile>((resolve) => release = resolve));
 await Promise.resolve();
 cache.delete("guild:user");
 release(profile);
 await pending;
 assert(await cache("guild:user", () => Promise.resolve(null)) === null, "Stale in-flight membership repopulated cache");
});
