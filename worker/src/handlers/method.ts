import { json, text } from "../respond";

const VERBS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

// /method            -> reflect the request method.
// /method/:verb      -> 200 if request method matches, else 405 with Allow.
export function handleMethod(req: Request, args: string[]): Response {
  const want = args[0]?.toUpperCase();
  if (!want) return json({ method: req.method });
  if (!VERBS.has(want)) return text(`unknown verb: ${want}\n`, 400);
  if (req.method === want) return json({ method: req.method, matched: true });
  return text(`expected ${want}, got ${req.method}\n`, 405, { allow: want });
}
