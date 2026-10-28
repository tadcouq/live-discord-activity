import { bot, presencesCache } from "../bot.ts";
import { buildUserData } from "./buildUserData.ts";
import { findMemberProfile, memberProfiles } from "./memberProfiles.ts";
import "./patchBigInt.ts";

export async function getUserData(id: string) {
 const guildId = Deno.env.get("GUILD_ID");
 if (!guildId) throw new Error("GUILD_ID is required to verify server membership");
 const profile = await memberProfiles(`${guildId}:${id}`, () =>
  findMemberProfile(async () => {
   const member = await bot.helpers.getMember(guildId, id);
   return member.user;
  }));
 if (!profile) return null;
 // Offline members may have no presence at all; membership was verified above.
 return buildUserData(profile, presencesCache.get(id));
}
