import type { cardOptionsSchema, User, UserActivity } from "./schemas.ts";
import { escape } from "./utils.ts";
import { base64ImageFetcher } from "./base64ImageFetcher.ts";
import { ActivityTypes } from "npm:@discordeno/types@20.0.0";
import { createAsyncCache } from "./asyncCache.ts";

const badgeImages = createAsyncCache<string>({ ttl: 60 * 60_000, maxEntries: 64, cacheable: Boolean });
const statuses: Record<string, string> = { online: "#43B581", idle: "#FAA61A", dnd: "#F04747", offline: "#747F8D" };

// XML 1.0 disallows control characters even inside escaped text.
function text(value: string, limit = 48) {
 const clean = Array.from(value).filter((char) => {
  const code = char.codePointAt(0)!;
  return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) || code >= 0x10000;
 }).join("");
 const chars = Array.from(clean);
 return escape(chars.slice(0, limit).join("") + (chars.length > limit ? "..." : ""));
}
function label(value: string, x: number, y: number, size = 13, extra = "", limit = 48) {
 return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${text(value, limit)}</text>`;
}
function image(data: string, x: number, y: number, size: number, extra = "") {
 return data ? `<image x="${x}" y="${y}" width="${size}" height="${size}" xlink:href="${data}" preserveAspectRatio="xMidYMid slice" ${extra}/>` : "";
}
function badgeImage(badge: string) {
 return badgeImages(badge, async () => {
  if (!/^[a-z0-9_]+$/i.test(badge)) return "";
  try {
   const bytes = await Deno.readFile(`./static/badges/${badge.toLowerCase()}.png`);
   return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
  } catch {
   return "";
  }
 });
}
export function selectActivities(activities: UserActivity[], options: cardOptionsSchema) {
 return activities.filter((activity) =>
  activity.type !== ActivityTypes.Custom &&
  !(options.hideSpotify && activity.name === "Spotify") &&
  !options.ignoreAppId.includes(String(activity.application_id ?? ""))
 ).slice(0, options.maxActivities);
}
function activityTime(activity: UserActivity) {
 const start = Number(activity.timestamps?.start);
 if (!Number.isFinite(start) || start <= 0) return "";
 const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
 return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} elapsed`;
}
async function activitySvg(activity: UserActivity, options: cardOptionsSchema, y: number, index: number) {
 const asset = activity.assets?.large_image ? await base64ImageFetcher(activity.assets.large_image) : "";
 const x = asset ? 96 : 12;
 const limit = asset ? 34 : 48;
 const labels: Record<number, string> = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching", 5: "Competing in" };
 let result = `<g clip-path="url(#content)">`;
 if (asset) result += `<defs><clipPath id="activity-${index}"><rect x="12" y="${y + 14}" width="72" height="72" rx="8"/></clipPath></defs>${image(asset, 12, y + 14, 72, `clip-path="url(#activity-${index})"`)}`;
 result += label(labels[activity.type] || "Activity", x, y + 16, 11, 'opacity="0.65"');
 result += label(activity.name || "Unknown", x, y + 36, 16, `font-weight="700"${activity.name === "Spotify" ? ' fill="#16883e"' : ""}`, limit);
 if (activity.details) result += label(activity.details, x, y + 54, 13, 'opacity="0.75"', limit + 5);
 if (activity.state) result += label(activity.state, x, y + 72, 13, 'opacity="0.65"', limit + 5);
 const elapsed = options.hideTimestamp ? "" : activityTime(activity);
 if (elapsed) result += label(elapsed, x, y + 89, 11, 'opacity="0.65"');
 return result + "</g>";
}

export async function generateCard(user: User, options: cardOptionsSchema): Promise<string> {
 const foreground = options.theme === "light" ? "#18202e" : "#ffffff";
 const activities = selectActivities(user.activities, options);
 const showActivity = options.hideActivity !== "true" && !(options.hideActivity === "whenNotUsed" && !activities.length);
 const profileHeight = options.hideProfile ? 0 : 64;
 const dividerHeight = !options.hideProfile && showActivity ? 12 : 0;
 const activityHeight = showActivity ? Math.max(1, activities.length) * 100 : 0;
 const height = Math.max(48, 24 + profileHeight + dividerHeight + activityHeight);
 const activityY = 12 + profileHeight + dividerHeight;
 const activityPromise = showActivity ? Promise.all(activities.map((activity, i) => activitySvg(activity, options, activityY + i * 100, i))) : Promise.resolve([]);
 let profile = "";
 if (!options.hideProfile) {
  const avatarUrl = options.animated ? user.avatar : user.avatar.replace(/\.gif(?=\?|$)/, ".png");
  const [avatar, emoji, badges] = await Promise.all([
   base64ImageFetcher(avatarUrl),
   !options.hideCustomStatus && user.customStatus?.image ? base64ImageFetcher(user.customStatus.image) : Promise.resolve(""),
   !options.hideBadges ? Promise.all(user.badges.slice(0, 10).map(badgeImage)) : Promise.resolve([]),
  ]);
  const status = statuses[user.status.desktop || user.status.mobile || user.status.web || "offline"] || statuses.offline;
  profile = `<circle cx="44" cy="44" r="32" fill="#747f8d"/>${image(avatar, 12, 12, 64, 'clip-path="url(#avatar)"')}`;
  if (!options.hideStatus) profile += `<circle cx="68" cy="68" r="8" fill="${status}" stroke="${options.backgroundColor}" stroke-width="4"/>`;
  profile += label(user.username || "Unknown", 88, 31, 17, 'font-weight="700"', 30);
  profile += badges.map((badge, i) => image(badge, 88 + i * 27, 37, 24)).join("");
  if (!options.hideCustomStatus && user.customStatus) {
   const y = badges.length ? 75 : 54;
   profile += image(emoji, 88, y - 13, 16);
   profile += label(user.customStatus.state || "", emoji ? 108 : 88, y, 13, 'opacity="0.65"', 36);
  }
 }
 let content = (await activityPromise).join("");
 if (showActivity && !activities.length) content = label(options.idleMessage, 200, activityY + 53, 14, 'text-anchor="middle" opacity="0.65"', 48);
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="${height}" viewBox="0 0 400 ${height}" role="img" aria-label="Discord activity card">
<title>Discord activity card</title>
<defs><clipPath id="avatar"><circle cx="44" cy="44" r="32"/></clipPath><clipPath id="content"><rect x="12" y="12" width="376" height="${height - 24}"/></clipPath></defs>
<rect width="400" height="${height}" rx="${options.borderRadius}" fill="${options.backgroundColor}"/>
<g font-family="Arial,Helvetica,sans-serif" fill="${foreground}" clip-path="url(#content)">${profile}
${dividerHeight ? `<path d="M12 87H388" stroke="${foreground}" opacity="0.1"/>` : ""}
${content}</g></svg>`;
}

export function generateErrorCard(error = "An error occurred while generating the card. Please try again later."): string {
 const message = Array.from(error).slice(0, 144).join("");
 const lines = message.match(/.{1,48}(?:\s|$)|.{1,48}/gu) || [message];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160" role="img" aria-label="Discord activity error"><rect width="400" height="160" rx="10" fill="#161a23"/><g font-family="Arial,Helvetica,sans-serif" text-anchor="middle"><text x="200" y="38" font-size="22" fill="#f87171">Unable to load profile</text><g fill="#ffffff" opacity="0.7">${lines.slice(0, 3).map((line, i) => label(line.trim(), 200, 75 + i * 22, 13)).join("")}</g></g></svg>`;
}
