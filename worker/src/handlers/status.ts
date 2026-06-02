import { text } from "../respond";

// /status/:code            -> exact code (ExpectedStatus::Exact / Range)
// /status/:a,:b,:c         -> random one-of (ExpectedStatus::OneOf, flaky-status)
// /status/:code?body=TEXT  -> combine with expected_body_contains
// Codes are limited to 200-599: the Response constructor rejects 1xx.
export function handleStatus(req: Request, args: string[]): Response {
  const spec = args[0];
  if (!spec)
    return text(
      "usage: /status/:code[,code...]  (200-599)  e.g. /status/200 or /status/200,500,503\n",
      400,
    );

  const codes = spec
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 200 && n <= 599);
  if (codes.length === 0) return text(`invalid status code (must be 200-599): ${spec}\n`, 400);

  const code = codes[Math.floor(Math.random() * codes.length)];
  const body = new URL(req.url).searchParams.get("body") ?? `status ${code}`;
  return text(body.endsWith("\n") ? body : `${body}\n`, code);
}
