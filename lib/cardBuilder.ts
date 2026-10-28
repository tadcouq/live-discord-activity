export type OutputFormat = "markdown" | "html" | "url";

export const builderDefaults = {
 theme: "dark",
 bgColor: "",
 borderRadius: "10",
 idleMessage: "There is nothing going on here!",
 maxActivities: "1",
 ignoreAppId: "",
 hideActivity: "false",
 hideStatus: "false",
 hideCustomStatus: "false",
 hideBadges: "false",
 hideProfile: "false",
 hideSpotify: "false",
 hideTimestamp: "false",
 animated: "true",
};
export type BuilderOptions = typeof builderDefaults;

export function buildCardUrl(base: string, userId: string, options: BuilderOptions) {
 const url = new URL(`/api/${encodeURIComponent(userId.trim())}`, base);
 for (const key of Object.keys(builderDefaults) as (keyof BuilderOptions)[]) {
  const value = options[key];
  if (value !== builderDefaults[key]) url.searchParams.set(key, value);
 }
 return url.toString();
}

export function formatCardOutput(url: string, userId: string, format: OutputFormat) {
 const profile = `https://discord.com/users/${encodeURIComponent(userId.trim())}`;
 if (format === "markdown") return `[![Discord Presence](${url})](${profile})`;
 if (format === "html") return `<a href="${profile}">\n  <img src="${url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}" alt="Discord Presence" />\n</a>`;
 return url;
}
