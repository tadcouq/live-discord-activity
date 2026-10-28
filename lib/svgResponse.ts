import type { cardOptionsSchema, User } from "./schemas.ts";
import { generateCard } from "./generateCard.ts";
import { createAsyncCache } from "./asyncCache.ts";

export function createCardRenderer(render = generateCard) {
 const cards = createAsyncCache<string>({ ttl: 5000, maxEntries: 32, maxWeight: 8 * 1024 * 1024, weight: (svg) => svg.length * 2 });
 return (user: User, options: cardOptionsSchema) => {
  const key = JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar, badges: user.badges, status: user.status, customStatus: user.customStatus, activities: user.activities, options }, (_key, value) => typeof value === "bigint" ? value.toString() : value);
  return cards(key, () => render(user, options));
 };
}

export const renderCard = createCardRenderer();

export async function svgResponse(req: Request, svg: string): Promise<Response> {
 const bytes = new TextEncoder().encode(svg);
 const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
 const etag = `"${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
 const headers = new Headers({
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "public, max-age=5, must-revalidate",
  "ETag": etag,
  "X-Content-Type-Options": "nosniff",
 });
 const matches = req.headers.get("If-None-Match")?.split(",").some((tag) => tag.trim() === "*" || tag.trim().replace(/^W\//, "") === etag);
 if (matches) return new Response(null, { status: 304, headers });
 headers.set("Content-Length", String(bytes.length));
 return new Response(req.method === "HEAD" ? null : bytes, { headers });
}
