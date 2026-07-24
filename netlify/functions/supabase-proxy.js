exports.handler = async (event, context) => {
  console.log("=== PROXY CALLED ===");
  console.log("=== FUNCTION CALLED ===");
  console.log("Method:", event.httpMethod);
  console.log("Path:", event.path);
  console.log("Raw URL:", event.rawUrl);
  
  try {
    const url = new URL(event.rawUrl);
    
    // Extrai o path removendo o prefixo da função
    const targetPath = url.pathname.replace(/^\/\.netlify\/functionS\/supabase-proxy/, "");
    const supabaseHost = process.env.SUPABASE_HOST || "yvybixhnsxvpwhfyvsgb.supabase.co";
    const targetUrl = `https://${supabaseHost}${targetPath}${url.search}`;
    
    console.log("Target URL:", targetUrl);

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

    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers,
      body: event.body,
    });

    console.log("Supabase response status:", response.status);

    // Converte headers de forma segura
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
    console.error("=== PROXY ERROR ===", err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        error: "Proxy failed", 
        message: err.message,
        stack: err.stack 
      }),
    };
  }
};
