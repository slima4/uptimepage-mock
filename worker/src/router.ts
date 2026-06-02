import { handleAuth } from "./handlers/auth";
import { handleBody, handleEcho, handleLarge } from "./handlers/body";
import { handleDelay, handleSlowBody } from "./handlers/delay";
import { handleBadGzip, handleBrotli, handleGzip } from "./handlers/encoding";
import { handleFlap } from "./handlers/flap";
import { handleHeaders, handleSetHeader } from "./handlers/headers";
import { handleIndex } from "./handlers/index";
import { handleMethod } from "./handlers/method";
import { handleRedirect, handleRedirectTo } from "./handlers/redirect";
import { handleRetryAfter } from "./handlers/retry_after";
import { handleStatus } from "./handlers/status";
import { json, text, withCors } from "./respond";

export async function route(req: Request): Promise<Response> {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const head = segs[0] ?? "";
  const rest = segs.slice(1);

  let res: Response;
  switch (head) {
    case "":
      res = handleIndex();
      break;
    case "status":
      res = handleStatus(req, rest);
      break;
    case "redirect":
      res = handleRedirect(req, rest);
      break;
    case "redirect-to":
      res = handleRedirectTo(req);
      break;
    case "delay":
      res = await handleDelay(req, rest);
      break;
    case "slow-body":
      res = handleSlowBody(req, rest);
      break;
    case "auth":
      res = handleAuth(req, rest);
      break;
    case "retry-after":
      res = handleRetryAfter(req, rest);
      break;
    case "gzip":
      res = handleGzip();
      break;
    case "brotli":
      res = handleBrotli();
      break;
    case "bad-gzip":
      res = handleBadGzip();
      break;
    case "large":
      res = handleLarge(req);
      break;
    case "body":
      res = handleBody(req);
      break;
    case "echo":
      res = await handleEcho(req);
      break;
    case "headers":
      res = handleHeaders(req);
      break;
    case "set-header":
      res = handleSetHeader(req);
      break;
    case "method":
      res = handleMethod(req, rest);
      break;
    case "flap":
      res = handleFlap(req);
      break;
    case "cors":
      res = json({ cors: true });
      break;
    default:
      res = text(`not found: /${segs.join("/")}\n`, 404);
      break;
  }

  res = withCors(res);
  // HEAD: preserve status + headers, drop the body.
  if (req.method === "HEAD")
    return new Response(null, { status: res.status, headers: res.headers });
  return res;
}
