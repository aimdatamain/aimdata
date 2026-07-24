exports.handler = async (event, context) => {
  try {
    const url = new URL(event.rawUrl);
    
    const targetPath = url.pathname.replace(/^\/\.netlify\/functions\/supabase-proxy/, "");
    const supabaseHost = process.env.SUPABASE_HOST || "yvybixhnsxvpwhfyvsgb.supabase.co";
    const targetUrl = `https://${supabaseHost}${targetPath}${url.search}`;

    console.log("=== PROXY CALLED ===");
    console.log("Target URL:", targetUrl);
    console.log("Method:", event.httpMethod);
    console.log("Key exists:", !!process.env.SUPABASE_ANON_KEY);

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

    const fetchOptions = {
      method: event.httpMethod,
      headers,
    };
    if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
      fetchOptions.body = event.body;
    }

    const response = await fetch(targetUrl, fetchOptions);

    console.log("Supabase status:", response.status);

    // REMOVE headers de encoding para evitar ERR_CONTENT_DECODING_FAILED
    const responseHeaders = {};
    if (response.headers && typeof response.headers.forEach === 'function') {
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== "content-encoding" && lowerKey !== "content-length" && lowerKey !== "transfer-encoding") {
          responseHeaders[key] = value;
        }
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
      body: JSON.stringify({ error: "Proxy failed", message: err.message }),
    };
  }
};
