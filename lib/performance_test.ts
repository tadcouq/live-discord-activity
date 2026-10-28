import { createAsyncCache } from "./asyncCache.ts";
import { base64ImageFetcher } from "./base64ImageFetcher.ts";
import { generateCard } from "./generateCard.ts";
import { cardOptions, type User } from "./schemas.ts";

function assert(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(message);
}

Deno.test("cache coalesces concurrent loads, expires and retries failures", async () => {
 let now = 0;
 let loads = 0;
 const cache = createAsyncCache<number>({ ttl: 10, maxEntries: 2, now: () => now });
 const loader = () => Promise.resolve(++loads);
 const values = await Promise.all([cache("a", loader), cache("a", loader)]);
 assert(values.join() === "1,1" && loads === 1, "Duplicate concurrent load");
 await cache("a", loader);
 assert(loads === 1, "Cache miss before expiry");
 now = 11;
 assert(await cache("a", loader) === 2, "Expired value reused");
 try {
  await cache("bad", () => Promise.reject(new Error("upstream failure")));
 } catch { /* Expected: rejected loads must not be cached. */ }
 assert(await cache("bad", loader) === 3, "Failed load was not retried");
});

Deno.test("cache respects LRU entry and byte budgets", async () => {
 const cache = createAsyncCache<string>({ ttl: 1000, maxEntries: 2, maxWeight: 4, weight: (value) => value.length });
 await cache("a", () => Promise.resolve("aa"));
 await cache("b", () => Promise.resolve("bb"));
 await cache("a", () => Promise.resolve("wrong"));
 await cache("c", () => Promise.resolve("cc"));
 assert(await cache("b", () => Promise.resolve("B")) === "B", "LRU not evicted");
 await cache("large", () => Promise.resolve("oversized"));
 assert(await cache("large", () => Promise.resolve("new")) === "new", "Oversized item cached");
});

Deno.test("image loads share requests; failures and oversized responses are not cached", async () => {
 const originalFetch = globalThis.fetch;
 let requests = 0;
 globalThis.fetch = () => {
  requests++;
  return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/png" } }));
 };
 try {
  const url = "https://images.test/shared.png";
  const values = await Promise.all([base64ImageFetcher(url), base64ImageFetcher(url)]);
  assert(values[0] === "data:image/png;base64,AQID" && requests === 1, "Duplicate image request or encoding error");
  await base64ImageFetcher(url);
  assert(requests === 1, "Warm image fetched again");
  globalThis.fetch = () => Promise.resolve(new Response("no", { status: 503 }));
  assert(await base64ImageFetcher("https://images.test/retry.png") === "", "Failure not handled");
  globalThis.fetch = () => Promise.resolve(new Response(new Uint8Array([1]), { headers: { "Content-Type": "image/png" } }));
  assert(!!await base64ImageFetcher("https://images.test/retry.png"), "Failure cached permanently");
  globalThis.fetch = () => Promise.resolve(new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { "Content-Type": "image/png" } }));
  assert(await base64ImageFetcher("https://images.test/large.png") === "", "Oversized stream accepted");
 } finally {
  globalThis.fetch = originalFetch;
 }
});

Deno.test("card loads independent assets concurrently and warm render makes no image requests", async () => {
 const originalFetch = globalThis.fetch;
 const requests: string[] = [];
 const releases: (() => void)[] = [];
 globalThis.fetch = (input) => {
  requests.push(String(input));
  return new Promise<Response>((resolve) => releases.push(() => resolve(new Response(new Uint8Array([1]), { headers: { "Content-Type": "image/png" } }))));
 };
 const user = {
  username: "Test",
  avatar: "https://images.test/avatar.png",
  badges: [],
  status: {},
  customStatus: { image: "https://images.test/emoji.png", state: "hello" },
  activities: [{ name: "Game", type: 0, assets: { large_image: "https://images.test/activity.png" } }],
 } as unknown as User;
 try {
  const rendering = generateCard(user, cardOptions.parse({}));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const concurrent = requests.length;
  releases.forEach((release) => release());
  assert(concurrent === 3, "Assets are loaded sequentially");
  await rendering;
  await generateCard(user, cardOptions.parse({ theme: "light" }));
  assert(requests.length === 3, "Changing theme refetched images");
 } finally {
  releases.forEach((release) => release());
  globalThis.fetch = originalFetch;
 }
});
