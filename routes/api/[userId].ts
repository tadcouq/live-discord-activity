import { fetchUserPresences } from "../../lib/fetchUserPresences.ts";
import { cardOptions, discordUserId } from "../../lib/schemas.ts";
import { getUserData } from "../../lib/getUserData.ts";
import { throwImageError } from "../../lib/errors.ts";
import { renderCard, svgResponse } from "../../lib/svgResponse.ts";
import { apiLogger } from "../../lib/logger.ts";
import { define } from "../../utils.ts";

async function handleCardRequest(req: Request, id: string) {
 try {
  const url = new URL(req.url);
  const queryOptions = url.searchParams;
  const options = cardOptions.safeParse(Object.fromEntries(queryOptions));

  if (!discordUserId.safeParse(id).success) return throwImageError(400, "Please provide a valid user ID!");
  if (!options.success) return throwImageError(400, "Please provide valid query parameters!");

  fetchUserPresences(id);
  const start = performance.now();
  const userData = await getUserData(id);
  const memberMs = performance.now() - start;
  if (!userData) return throwImageError(404, `User not found! Did you join the server? ${Deno.env.get("INVITE_LINK")}`);

  const image = await renderCard(userData, options.data);
  const renderMs = performance.now() - start - memberMs;
  const response = await svgResponse(req, image);
  response.headers.set("Server-Timing", `member;dur=${memberMs.toFixed(1)}, render;dur=${renderMs.toFixed(1)}`);
  return response;
 } catch (error) {
  apiLogger.error(error);
  return throwImageError(500, "Something went wrong while generating the user card!");
 }
}

export const handler = define.handlers({
 GET: ({ req, params }) => handleCardRequest(req, params.userId),
 HEAD: ({ req, params }) => handleCardRequest(req, params.userId).then((response) => new Response(null, { status: response.status, headers: response.headers })),
});
