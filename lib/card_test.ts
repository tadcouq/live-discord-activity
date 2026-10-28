import { cardOptions, type User } from "./schemas.ts";
import { generateCard, selectActivities } from "./generateCard.ts";

function assert(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(message);
}

Deno.test("query options apply defaults, themes and background aliases", () => {
 assert(cardOptions.parse({}).backgroundColor === "#161a23", "Default background changed");
 const options = cardOptions.parse(Object.fromEntries(new URLSearchParams("theme=light&bgColor=abc&hideStatus=true&borderRadius=12px")));
 assert(options.backgroundColor === "#abc" && options.hideStatus && options.borderRadius === "12", "Query options ignored");
 assert(cardOptions.parse({ theme: "light" }).backgroundColor === "#ffffff", "Light background missing");
 assert(cardOptions.parse({ bg: "123", bgColor: "456", backgroundColor: "789" }).backgroundColor === "#789", "Wrong alias precedence");
});

Deno.test("unsafe and invalid options are rejected", () => {
 for (const input of [{ borderRadius: "10; color:red" }, { bg: "<script>" }, { maxActivities: "6" }, { hideStatus: "yes" }, { ignoreAppId: "invalid" }]) {
  assert(!cardOptions.safeParse(input).success, "Invalid input accepted");
 }
});

const user = {
 username: "<A&B>",
 id: 123456789012345678n,
 bot: false,
 avatar: "data:image/png;base64,iVBORw0KGgo=",
 discriminator: "0",
 publicFlags: 0,
 badges: [],
 status: {},
 customStatus: { image: null, state: null },
 activities: [
  { name: "Spotify", type: 2, created_at: 0 },
  { name: "Game A", type: 0, created_at: 0, application_id: "123456789012345678" },
  { name: "Game B", type: 0, created_at: 0 },
 ],
} as unknown as User;

Deno.test("activity filtering occurs before the display limit", () => {
 const result = selectActivities(user.activities, cardOptions.parse({ hideSpotify: "true", ignoreAppId: "123456789012345678" }));
 assert(result.length === 1 && result[0].name === "Game B", "Wrong visible activity");
 assert(user.activities.length === 3, "Source activities mutated");
});

Deno.test("cards resize, hide sections and escape user text", async () => {
 const full = await generateCard(user, cardOptions.parse({ maxActivities: "3" }));
 assert(full.includes('height="400"') && full.includes("&lt;A&amp;B&gt;"), "Layout or escaping failed");
 assert(full.includes("Game A") && full.includes("Game B"), "Missing activities");
 const profile = await generateCard(user, cardOptions.parse({ hideActivity: "true" }));
 assert(profile.includes('height="88"') && !profile.includes("Game A"), "Activity section not hidden");
 const empty = await generateCard({ ...user, activities: [] }, cardOptions.parse({ hideProfile: "true", hideActivity: "whenNotUsed" }));
 assert(empty.includes('height="48"') && !empty.includes("Avatar"), "Empty layout failed");
});
