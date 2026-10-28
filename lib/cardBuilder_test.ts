import { buildCardUrl, builderDefaults, formatCardOutput } from "./cardBuilder.ts";
import { cardOptions } from "./schemas.ts";

function assert(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(message);
}
const id = "544164729354977282";

Deno.test("builder uses the deployment origin and encodes options without leaking homepage query", () => {
 const url = buildCardUrl("https://example.com/?campaign=test", id, { ...builderDefaults, theme: "light", idleMessage: 'Music & <friends> "hello"', maxActivities: "3", bgColor: "#abc" });
 const parsed = new URL(url);
 assert(parsed.pathname === `/api/${id}` && !parsed.searchParams.has("campaign"), "Wrong API URL");
 const options = cardOptions.parse(Object.fromEntries(parsed.searchParams));
 assert(options.theme === "light" && options.maxActivities === 3 && options.backgroundColor === "#abc", "Options lost");
 assert(options.idleMessage === 'Music & <friends> "hello"', "Special characters corrupted");
 assert(buildCardUrl("https://example.com/", id, builderDefaults) === `https://example.com/api/${id}`, "Defaults clutter the URL");
});

Deno.test("all three exports share exactly the same configured SVG URL", () => {
 const url = buildCardUrl("https://example.com", id, { ...builderDefaults, theme: "light", hideSpotify: "true" });
 assert(formatCardOutput(url, id, "url") === url, "URL export differs");
 assert(formatCardOutput(url, id, "markdown") === `[![Discord Presence](${url})](https://discord.com/users/${id})`, "Invalid Markdown");
 const html = formatCardOutput(url, id, "html");
 assert(html.includes(`src="${url.replaceAll("&", "&amp;")}"`) && html.includes(`<a href="https://discord.com/users/${id}">`), "HTML did not escape or link SVG");
});
