import { bearerToken, sendError } from "../_lib/http.js";
import { authenticateSessionTicket, getOwnedEntitlements } from "../_lib/playfab.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed." });
  try {
    const playFabId = await authenticateSessionTicket(bearerToken(request));
    const entitlements = await getOwnedEntitlements(playFabId);
    response.status(200).json({ entitlements });
  } catch (error) {
    sendError(response, error);
  }
}
