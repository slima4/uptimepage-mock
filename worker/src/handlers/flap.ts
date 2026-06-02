import { text } from "../respond";

// /flap?period=N -> alternates 200/500 every N seconds (default 60).
// Drives the monitor's state-transition + alerting paths deterministically.
export function handleFlap(req: Request): Response {
  let period = Number.parseInt(new URL(req.url).searchParams.get("period") ?? "60", 10);
  if (!Number.isInteger(period) || period <= 0) period = 60;
  const up = Math.floor(Date.now() / 1000 / period) % 2 === 0;
  return text(up ? "up\n" : "down\n", up ? 200 : 500);
}
