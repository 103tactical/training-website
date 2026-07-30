import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getHostRedirect } from "~/lib/redirects.server";

/**
 * Catch-all for paths that don't exist in this app. Old-domain URLs
 * (every old WordPress path lands here) 301 to their mapped new-site page;
 * on the canonical domain this stays a plain 404.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const target = getHostRedirect(request);
  if (target) throw redirect(target, 301);
  throw new Response("Not Found", { status: 404 });
}

export default function CatchAll() {
  return null;
}
