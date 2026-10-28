import type { User, UserActivity } from "./schemas.ts";
import type { cardOptionsSchema } from "./schemas.ts";
import { escape, shortenText } from "./utils.ts";
import { base64ImageFetcher } from "./base64ImageFetcher.ts";
import { ActivityTypes } from "npm:@discordeno/types@20.0.0";
import { apiLogger } from "../lib/logger.ts";

import { createAsyncCache } from "./asyncCache.ts";

const badgeImages = createAsyncCache<string>({ ttl: 60 * 60_000, maxEntries: 64, cacheable: Boolean });

const availableStatuses: Record<string, string> = {
 online: "#43B581",
 idle: "#FAA61A",
 dnd: "#F04747",
 offline: "#747F8D",
};

async function generateBadgeImages(badges: string[]) {
 const userBadges = new Map<string, string>();

 await Promise.all(badges.map(async (badge) => {
  const image = await badgeImages(badge, async () => {
   try {
    const fileData = await Deno.readFile(`./static/badges/${badge.toLowerCase()}.png`);
    return `data:image/png;base64,${btoa(String.fromCharCode(...fileData))}`;
   } catch {
    apiLogger.error(`Failed to load badge image: ${badge}`);
    return "";
   }
  });
  userBadges.set(badge, image);
 }));

 return badges
  .map(
   (badge) => `
        <img
          src="${userBadges.get(badge) || ""}"
          alt="${escape(badge)}"
          width="24px"
          height="24px"
          style="margin-left: 4px;"
        />
      `,
  )
  .join("");
}

function text(value: string, limit = 48) {
 return escape(shortenText(value, limit));
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
 const minutes = Math.floor(seconds / 60);
 return `${minutes}:${String(seconds % 60).padStart(2, "0")} elapsed`;
}

async function generateActivityDetails(activity: UserActivity, options: cardOptionsSchema, foreground: string) {
 const image = activity.assets?.large_image ? await base64ImageFetcher(activity.assets.large_image) : "";
 const labels: Record<number, string> = {
  [ActivityTypes.Playing]: "Playing",
  [ActivityTypes.Streaming]: "Streaming",
  [ActivityTypes.Listening]: "Listening to",
  [ActivityTypes.Watching]: "Watching",
  [ActivityTypes.Competing]: "Competing in",
 };
 const elapsed = options.hideTimestamp ? "" : activityTime(activity);
 return `<div style="display:flex;align-items:center;gap:12px;height:100px;color:${foreground};">
  ${image ? `<img src="${image}" alt="${text(activity.assets?.large_text || "Activity image")}" width="72" height="72" style="border-radius:8px;object-fit:cover;" />` : ""}
  <div style="min-width:0;flex:1;line-height:1.4;overflow:hidden;">
   <div style="font-size:11px;opacity:0.65;">${labels[activity.type] || "Activity"}</div>
   <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${activity.name === "Spotify" ? "color:#16883e;" : ""}">${text(activity.name || "Unknown")}</div>
   ${activity.details ? `<div style="font-size:13px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${text(activity.details, 80)}</div>` : ""}
   ${activity.state ? `<div style="font-size:13px;opacity:0.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${text(activity.state, 80)}</div>` : ""}
   ${elapsed ? `<div style="font-size:11px;opacity:0.65;">${elapsed}</div>` : ""}
  </div>
 </div>`;
}

export async function generateCard(user: User, options: cardOptionsSchema): Promise<string> {
 try {
  const foreground = options.theme === "light" ? "#18202e" : "#ffffff";
  const activities = selectActivities(user.activities, options);
  const showActivity = options.hideActivity !== "true" && !(options.hideActivity === "whenNotUsed" && !activities.length);
  const profileHeight = options.hideProfile ? 0 : 64;
  const activityHeight = showActivity ? Math.max(1, activities.length) * 100 : 0;
  const dividerHeight = !options.hideProfile && showActivity ? 12 : 0;
  const height = Math.max(48, 24 + profileHeight + dividerHeight + activityHeight);
  const userName = text(user.username || "Unknown", 32);
  const userStatus = availableStatuses[user.status.desktop || user.status.mobile || user.status.web || "offline"] || availableStatuses.offline;
  // Start all independent image work together; only visible sections fetch assets.
  const activityContentPromise = !showActivity ? Promise.resolve("") : activities.length ? Promise.all(activities.map((activity) => generateActivityDetails(activity, options, foreground))).then((parts) => parts.join("")) : Promise.resolve(`<div style="height:100px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:14px;opacity:0.65;overflow-wrap:anywhere;">${text(options.idleMessage, 100)}</div>`);
  let profile = "";
  if (!options.hideProfile) {
   const avatarUrl = options.animated ? user.avatar : user.avatar.replace(/\.gif(?=\?|$)/, ".png");
   const [avatar, emoji, badges] = await Promise.all([
    base64ImageFetcher(avatarUrl),
    !options.hideCustomStatus && user.customStatus?.image ? base64ImageFetcher(user.customStatus.image) : Promise.resolve(""),
    !options.hideBadges && user.badges.length ? generateBadgeImages(user.badges) : Promise.resolve(""),
   ]);
   profile = `<div style="display:flex;align-items:center;height:64px;gap:12px;">
    <div style="position:relative;flex-shrink:0;width:64px;height:64px;">
     <img alt="${userName}'s Avatar" src="${avatar}" width="64" height="64" style="border-radius:100%;" />
     ${!options.hideStatus ? `<div style="position:absolute;bottom:0;right:0;border:4px solid ${options.backgroundColor};border-radius:100%;width:12px;height:12px;background:${userStatus};"></div>` : ""}
    </div>
    <div style="min-width:0;flex:1;">
     <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${userName}</div>
     ${!options.hideBadges && user.badges.length ? `<div style="display:flex;height:24px;overflow:hidden;">${badges}</div>` : ""}
     ${!options.hideCustomStatus && user.customStatus ? `<div style="font-size:13px;opacity:0.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${emoji ? `<img src="${emoji}" alt="emoji" width="16" height="16" /> ` : ""}${text(user.customStatus.state || "", 64)}</div>` : ""}
    </div>
   </div>`;
  }
  const activityContent = await activityContentPromise;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${height}" viewBox="0 0 400 ${height}" role="img" aria-label="Discord activity card">
   <title>Discord activity card</title>
   <foreignObject x="0" y="0" width="400" height="${height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:400px;height:${height}px;padding:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;background:${options.backgroundColor};color:${foreground};border-radius:${options.borderRadius}px;overflow:hidden;">
     ${profile}
     ${dividerHeight ? `<div style="height:1px;margin-top:11px;background:${foreground};opacity:0.1;"></div>` : ""}
     ${activityContent}
    </div>
   </foreignObject>
  </svg>`;
 } catch (error) {
  apiLogger.error("Error generating card:", error);
  return generateErrorCard("Failed to generate card.");
 }
}

export function generateErrorCard(error?: string): string {
 return `
 <svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="406px" height="195px">
 <foreignObject x="0" y="0" width="406px" height="195px">
  <div
   xmlns="http://www.w3.org/1999/xhtml"
   style="
    position: absolute;
    font-size: 16px;
    width: 406px;
    height: 195px;
    inset: 0px;
    font-family: 'Century Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #161a23;
    border-radius: 10px;
   ">
  <div
   style="
    display: flex;
    background-color: #161a23;
    border-radius: 10px;
    flex-direction: column;
    padding: 12px;
   "
  >
   <span
    style="
     display: flex;
     align-items: center;
     font-size: 25px;
     margin: 0 auto;
     gap: 8px;
     white-space: nowrap;
     font-weight: 700;
     color: #F87171;
    "
   >
    <svg
     xmlns="http://www.w3.org/2000/svg"
     fill="none"
     viewBox="0 0 24 24"
     stroke-width="2"
     stroke="#F87171"
     style="
      width: 2rem;
      height: 2rem;
     "
    >
     <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
    <span style="
    margin-top: -2px;
    ">
    Error
    </span>
   </span>
   <div
    style="
     width: 100%;
     background-color: #ffffff1a;
     height: 1px;
     margin-top: 12px;
    "
   />
    <span
     style="
      padding-top: 12px;
      word-break: break-word;
      font-weight: 400;
      text-align: center;
      margin: 0 auto;
      color: #fff;
      opacity: 0.5;
     "
    >
     ${shortenText(escape(error || "An error occured while generating the card. Please try again later."), 80)}
    </span>
  </div>
  </div>
  </foreignObject>
  </svg>
  `;
}
