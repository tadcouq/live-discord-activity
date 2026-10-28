import { createCardRenderer, svgResponse } from "./svgResponse.ts";
import { generateCard, generateErrorCard } from "./generateCard.ts";
import { createPresenceRefresh } from "./presenceRefresh.ts";
import { cardOptions, type User } from "./schemas.ts";

function assert(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(message);
}
const user = {
 id: 473842627515514884n,
 username: 'A<&"\u0001',
 avatar: "data:image/png;base64,AQID",
 badges: [],
 status: { desktop: "online" },
 customStatus: { state: "hello & friends", image: null },
 activities: [{ name: "Game", type: 0 }],
} as unknown as User;

Deno.test("success and error cards are self-contained native SVG with safe XML text", async () => {
 const svg = await generateCard(user, cardOptions.parse({}));
 for (const value of [svg, generateErrorCard("Invalid <user> & request\u0001")]) {
  assert(value.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), "Missing SVG root");
  assert(!/<(?:foreignObject|div|span|img|script)\b/i.test(value), "HTML or script inside SVG");
  assert(!value.includes("\u0001"), "Illegal XML control character");
 }
 assert(svg.includes("A&lt;&amp;&#34;") && svg.includes('xlink:href="data:image/png;base64,'), "Unsafe text or missing embedded image");
 const unicode = await generateCard({ ...user, username: "a".repeat(29) + "😀😀" }, cardOptions.parse({}));
 assert(unicode.includes("😀..."), "Truncation split a surrogate pair");
});

Deno.test("SVG GET, HEAD and conditional GET expose matching metadata and support 304", async () => {
 const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Tiếng Việt</text></svg>';
 const get = await svgResponse(new Request("https://example.com/api/1"), svg);
 assert(get.status === 200 && get.headers.get("content-type") === "image/svg+xml; charset=utf-8", "Wrong image response");
 assert(Number(get.headers.get("content-length")) === new TextEncoder().encode(svg).length, "Wrong UTF-8 byte length");
 assert(get.headers.get("cache-control")?.includes("max-age=5"), "Missing bounded freshness");
 const head = await svgResponse(new Request("https://example.com/api/1", { method: "HEAD" }), svg);
 assert(await head.text() === "" && head.headers.get("etag") === get.headers.get("etag"), "HEAD mismatch");
 const cached = await svgResponse(new Request("https://example.com/api/1", { headers: { "If-None-Match": `W/${get.headers.get("etag")}` } }), svg);
 assert(cached.status === 304 && await cached.text() === "", "Conditional GET did not return 304");
 const changed = await svgResponse(new Request("https://example.com/api/1", { headers: { "If-None-Match": get.headers.get("etag")! } }), svg + "\n");
 assert(changed.status === 200, "Changed image incorrectly returns 304");
});

Deno.test("render cache coalesces identical cards but isolates options and new presence data", async () => {
 let count = 0;
 const render = createCardRenderer(() => Promise.resolve(`svg-${++count}`));
 const options = cardOptions.parse({});
 const [a, b] = await Promise.all([render(user, options), render(user, options)]);
 assert(a === b && count === 1, "Concurrent render not deduplicated");
 assert(await render(user, options) === a, "Warm card not reused");
 assert(await render(user, cardOptions.parse({ theme: "light" })) !== a, "Theme cache collision");
 assert(await render({ ...user, status: { desktop: "offline" } }, options) !== a, "Stale presence reused");
});

Deno.test("gateway refresh never blocks image requests and skips known/repeated presence", async () => {
 let sends = 0;
 let release!: () => void;
 const errors: unknown[] = [];
 const refresh = createPresenceRefresh(
  () => {
   sends++;
   return new Promise<void>((resolve) => release = resolve);
  },
  (id) => id === "known",
  (error) => errors.push(error),
 );
 assert(refresh("cold") === undefined, "Request waits for gateway");
 refresh("cold");
 refresh("known");
 await Promise.resolve();
 assert(sends === 1, "Gateway request duplicated");
 release();
 await new Promise((resolve) => setTimeout(resolve, 0));
 refresh("cold");
 assert(sends === 1 && errors.length === 0, "Refresh cooldown ignored");
 const failing = createPresenceRefresh(() => Promise.reject(new Error("gateway down")), () => false, (error) => errors.push(error));
 failing("cold");
 await new Promise((resolve) => setTimeout(resolve, 0));
 assert(Number(errors.length) === 1, "Background errors not handled");
});
