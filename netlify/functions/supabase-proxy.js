exports.handler = async (event, context) => {
  const url = new URL(event.rawUrl);
  
  // O redirect manda: /.netlify/functionS/supabase-proxy/auth/v1/user
  // Precisamos extrair o path real removendo o prefixo da função
  const targetPath = url.pathname.replace(/^\/\.netlify\/functionS\/supabase-proxy/, "");
  const supabaseHost = process.env.SUPABASE_HOST || "yvybixhnsxvpwhfyvsgb.supabase.co";
  const targetUrl = `https://${supabaseHost}${targetPath}${url.search}`;

  const headers = {};
  for (const [key, value] of Object.entries(event.headers)) {
    if (key.toLowerCase() !== "host" && value !== undefined && value !== null) {
      headers[key] = value;
    }
  }

  delete headers["apikey"];
  delete headers["authorization"];

  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (anonKey) {
    headers["apikey"] = anonKey;
    headers["authorization"] = `Bearer ${anonKey}`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers,
      body: event.body,
    });

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: await response.text(),
    };
  } catch (err) {
    console.error("Proxy error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Proxy failed", message: err.message }),
    };
  }
};
