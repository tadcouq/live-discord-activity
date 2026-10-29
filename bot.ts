import "@std/dotenv/load";
import { createBot, DiscordGatewayPayload, DiscordGuildMembersChunk } from "@discordeno/bot";
import { DiscordPresenceUpdate, Intents } from "npm:@discordeno/types@20.0.0";
import { addDesiredProperties } from "./lib/addDesiredProperties.ts";

import { memberProfiles } from "./lib/memberProfiles.ts";
import { createPresenceWait } from "./lib/presenceWait.ts";

export const presencesCache = new Map<string, DiscordPresenceUpdate>();
export const presenceWait = createPresenceWait(presencesCache);

export const bot = createBot({
 token: Deno.env.get("TOKEN") || "",
 intents: Intents.Guilds | Intents.GuildMembers | Intents.GuildPresences,
 desiredProperties: {
  member: { user: true },
  user: {
   id: true,
   username: true,
   discriminator: true,
   flags: true,
   publicFlags: true,
   avatar: true,
   toggles: true,
   globalName: true,
  },
 },
 gateway: {
  cache: {
   requestMembers: {
    enabled: true,
   },
  },
 },
 events: {
  raw: (data: DiscordGatewayPayload) => {
   if (data.t === "GUILD_MEMBERS_CHUNK") {
    const guildChunk = data.d as DiscordGuildMembersChunk;
    if (guildChunk.guild_id.toString() !== Deno.env.get("GUILD_ID")) return;
    if (!guildChunk.presences) return;
    guildChunk.presences.forEach((presence: DiscordPresenceUpdate) => {
     presenceWait.update(presence.user.id.toString(), presence);
    });
   }
   if (data.t === "PRESENCE_UPDATE") {
    const presence = data.d as DiscordPresenceUpdate;
    if (presence.guild_id.toString() !== Deno.env.get("GUILD_ID")) return;
    presenceWait.update(presence.user.id.toString(), presence);
   }
   if (data.t === "GUILD_MEMBER_REMOVE" || data.t === "GUILD_MEMBER_UPDATE" || data.t === "GUILD_MEMBER_ADD") {
    const member = data.d as { guild_id: string; user: { id: string } };
    if (member.guild_id.toString() !== Deno.env.get("GUILD_ID")) return;
    const id = member.user.id.toString();
    memberProfiles.delete(`${member.guild_id}:${id}`);
    if (data.t === "GUILD_MEMBER_REMOVE") presencesCache.delete(id);
   }
  },
  ready: ({ user }) => {
   bot.logger.info(`Connected to Discord! Client: ${user.username}#${user.discriminator} (ID: ${user.id})`);
  },
 },
});

addDesiredProperties(bot);

// REST member lookup can run before the gateway is ready. Do not block HTTP
// route loading (and GitHub's image proxy) on a websocket handshake/cold start.
void bot.start().catch((error) => bot.logger.error("Discord gateway startup failed", error));
