import { createAsyncCache } from "./asyncCache.ts";

const images = createAsyncCache<string>({
 ttl: 5 * 60_000,
 maxEntries: 128,
 maxWeight: 16 * 1024 * 1024,
 weight: (value) => value.length * 2,
 cacheable: Boolean,
});
const maxImageBytes = 256 * 1024;

function sizedImageUrl(url: string) {
 try {
  const parsed = new URL(url);
  if (parsed.hostname === "cdn.discordapp.com" || parsed.hostname === "media.discordapp.net") parsed.searchParams.set("size", "128");
  return parsed.toString();
 } catch {
  return url;
 }
}

export const base64ImageFetcher = (url: string): Promise<string> =>
 images(sizedImageUrl(url), async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
   const res = await fetch(sizedImageUrl(url), { signal: controller.signal });
   const mime = res.headers.get("content-type")?.split(";")[0].trim();
   if (!res.ok || !mime || !/^image\/(png|jpeg|jpg|gif|webp|avif|x-icon)$/i.test(mime) || Number(res.headers.get("content-length")) > maxImageBytes) {
    await res.body?.cancel();
    return "";
   }
   if (!res.body) return "";
   const reader = res.body.getReader();
   const chunks: Uint8Array[] = [];
   let size = 0;
   while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxImageBytes) {
     await reader.cancel();
     return "";
    }
    chunks.push(value);
   }
   let binary = "";
   for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 8192) binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
   }
   return size ? `data:${mime};base64,${btoa(binary)}` : "";
  } catch {
   return "";
  } finally {
   clearTimeout(timer);
  }
 });
