import { z } from "zod";
import type { User as DiscordUser } from "@discordeno/bot";
import type { DiscordActivity, DiscordClientStatus } from "npm:@discordeno/types@20.0.0";

export const discordUserId = z.string().regex(/^\d{17,19}$/);

export const hexcolorRegex = /^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;

const booleanOption = z.enum(["true", "false"]).default("false").transform((value) => value === "true");
const colorOption = z.string().regex(hexcolorRegex, "Invalid hex color code").transform((value) => value.startsWith("#") ? value : `#${value}`);

export const cardOptions = z.object({
 theme: z.enum(["dark", "light"]).default("dark"),
 backgroundColor: colorOption.optional(),
 bgColor: colorOption.optional(),
 bg: colorOption.optional(),
 borderRadius: z.string().regex(/^\d{1,3}(px)?$/).default("10").transform((value) => String(Math.min(100, parseInt(value)))),
 idleMessage: z.string().max(200).default("There is nothing going on here!"),
 hideStatus: booleanOption,
 hideBadges: booleanOption,
 hideCustomStatus: booleanOption,
 hideProfile: booleanOption,
 hideActivity: z.enum(["true", "false", "whenNotUsed"]).default("false"),
 hideSpotify: booleanOption,
 hideTimestamp: booleanOption,
 animated: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
 maxActivities: z.string().regex(/^[1-5]$/).default("1").transform(Number),
 ignoreAppId: z.string().max(500).default("").refine((value) => !value || value.split(",").every((id) => /^\d{17,20}$/.test(id.trim())), "Invalid application IDs").transform((value) => value ? value.split(",").map((id) => id.trim()) : []),
}).transform((options) => ({
 ...options,
 backgroundColor: options.backgroundColor ?? options.bgColor ?? options.bg ?? (options.theme === "light" ? "#ffffff" : "#161a23"),
}));

export type cardOptionsSchema = z.infer<typeof cardOptions>;

export type UserActivity = Omit<DiscordActivity, "party" | "instance" | "secrets">;

export interface User {
 username: DiscordUser["globalName"] | DiscordUser["username"] | "Unknown";
 id: DiscordUser["id"];
 bot: DiscordUser["bot"];
 activities: UserActivity[];
 avatar: string;
 discriminator: DiscordUser["discriminator"];
 publicFlags: DiscordUser["publicFlags"];
 badges: string[];
 status: DiscordClientStatus;
 customStatus: {
  image: string | null;
  state: string | null;
 };
}
