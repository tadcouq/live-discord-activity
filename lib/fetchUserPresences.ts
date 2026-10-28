import { GatewayOpcodes } from "npm:@discordeno/types@20.0.0";
import { bot, presencesCache } from "../bot.ts";
import { createPresenceRefresh } from "./presenceRefresh.ts";

export const fetchUserPresences = createPresenceRefresh(
 async (userId) => {
  const guildId = Deno.env.get("GUILD_ID");
  if (!guildId) return;
  await bot.gateway.sendPayload(bot.gateway.calculateShardId(guildId), {
   op: GatewayOpcodes.RequestGuildMembers,
   d: { guild_id: guildId, presences: true, user_ids: [userId] },
  });
 },
 (id) => presencesCache.has(id),
 (error) => bot.logger.error(error),
);
