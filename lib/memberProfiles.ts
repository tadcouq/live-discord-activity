import type { User } from "@discordeno/bot";
import { createAsyncCache } from "./asyncCache.ts";

export type MemberProfile = Pick<User, "id" | "username" | "globalName" | "bot" | "avatar" | "discriminator" | "publicFlags">;

// Membership and profile metadata are verified together, independently of presence.
export const memberProfiles = createAsyncCache<MemberProfile | null>({ ttl: 30_000, maxEntries: 512, cacheable: Boolean });

export async function findMemberProfile(load: () => Promise<MemberProfile | undefined>): Promise<MemberProfile | null> {
 try {
  const profile = await load();
  if (!profile) throw new Error("Discord returned a member without a user profile");
  return profile;
 } catch (error) {
  // Discordeno REST rejects with { status, body: JSON string }. Only Unknown Member
  // means not in the server: permissions, unknown guild and network errors must surface.
  if (error && typeof error === "object" && "status" in error && error.status === 404 && "body" in error) {
   const body = typeof error.body === "string" ? JSON.parse(error.body) : error.body;
   if (body && typeof body === "object" && "code" in body && body.code === 10007) return null;
  }
  throw error;
 }
}
