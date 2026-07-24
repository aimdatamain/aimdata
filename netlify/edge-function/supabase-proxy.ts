import type { Context } from "https://edge.netlify.com/";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  const targetPath = url.pathname.replace(/^\/api\/supabase/, "");
  const supabaseHost = Deno.env.get("SUPABASE_HOST") || "yvybixhnsxvpwhfyvsgb.supabase.co";
  const targetUrl = `https://${supabaseHost}${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (anonKey) {
    headers.set("apikey", anonKey);
    headers.set("authorization", `Bearer ${anonKey}`);
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};
