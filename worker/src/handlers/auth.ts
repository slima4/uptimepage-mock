import { text } from "../respond";

// /auth/basic/:user/:pass  -> 401 unless Authorization: Basic base64(user:pass)
// /auth/bearer/:token      -> 401 unless Authorization: Bearer token
export function handleAuth(req: Request, args: string[]): Response {
  const kind = args[0];
  if (kind === "basic") return basic(req, args[1], args[2]);
  if (kind === "bearer") return bearer(req, args[1]);
  return text("usage: /auth/basic/:user/:pass  |  /auth/bearer/:token\n", 400);
}

function basic(req: Request, user = "", pass = ""): Response {
  let expected: string;
  try {
    expected = `Basic ${btoa(`${user}:${pass}`)}`;
  } catch {
    // Non-Latin1 credentials cannot be Basic-encoded, so no header can match.
    return unauthorized('Basic realm="uptimepage-mock"');
  }
  if (req.headers.get("authorization") === expected) return text("authorized\n", 200);
  return unauthorized('Basic realm="uptimepage-mock"');
}

function bearer(req: Request, token = ""): Response {
  if (req.headers.get("authorization") === `Bearer ${token}`) return text("authorized\n", 200);
  return unauthorized("Bearer");
}

function unauthorized(challenge: string): Response {
  return text("unauthorized\n", 401, { "www-authenticate": challenge });
}
