export function bearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export function sendError(response, error) {
  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  response.status(status).json({ error: status >= 500 ? "The DLC service is temporarily unavailable." : error.message });
}

export async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
