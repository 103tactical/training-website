import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import type { EntryContext } from "@remix-run/node";

/**
 * Security headers applied to every HTML response.
 *
 * X-Frame-Options        — blocks the site from being embedded in an iframe
 *                          (prevents clickjacking attacks).
 * X-Content-Type-Options — tells browsers not to sniff MIME types
 *                          (prevents drive-by downloads via text/plain → executable).
 * Referrer-Policy        — only sends the origin (no path) in the Referer header
 *                          so analytics don't leak booking URLs to third parties.
 * Permissions-Policy     — disables browser features this site never uses
 *                          so a compromised script can't silently access camera/mic/location.
 */
function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
        abortDelay={Number(process.env.ABORT_DELAY ?? "5_000")}
      />,
      {
        onShellReady() {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          applySecurityHeaders(responseHeaders);

          pipe(body);

          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }));
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          console.error(error);
        },
      }
    );
  });
}
