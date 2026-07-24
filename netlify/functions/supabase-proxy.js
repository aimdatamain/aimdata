exports.handler = async (event, context) => {
  try {
    const url = new URL(event.rawUrl);
    
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

    // NÃO passa body em GET/HEAD — fetch do Node.js rejeita
    const fetchOptions = {
      method: event.httpMethod,
      headers,
    };
    if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
      fetchOptions.body = event.body;
    }

    const response = await fetch(targetUrl, fetchOptions);

    const responseHeaders = {};
    if (response.headers && typeof response.headers.forEach === 'function') {
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
    } else if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        responseHeaders[key] = value;
      });
    }

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: await response.text(),
    };
  } catch (err) {
    console.error("Proxy error:", err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        error: "Proxy failed", 
        message: err.message 
      }),
    };
  }
};
