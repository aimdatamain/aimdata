exports.handler = async (event, context) => {
  try {
    const url = new URL(event.rawUrl);
    
    const targetPath = url.pathname.replace(/^\/\.netlify\/functions\/supabase-proxy/, "");
    const supabaseHost = process.env.SUPABASE_HOST || "yvybixhnsxvpwhfyvsgb.supabase.co";
    const targetUrl = `https://${supabaseHost}${targetPath}${url.search}`;

    const headers = {};
    for (const [key, value] of Object.entries(event.headers)) {
      if (key.toLowerCase() !== "host" && value !== undefined && value !== null) {
        headers[key] = value;
      }
    }

    // SEMPRE envia a chave anônima no apikey
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (anonKey) {
      headers["apikey"] = anonKey;
    }

    // PRESERVA o token de usuário no authorization se existir
    // (necessário para rotas autenticadas como /auth/v1/user)
    // Só usa Bearer + chave anônima se não houver token de usuário
    const userAuth = headers["authorization"];
    if (!userAuth && anonKey) {
      headers["authorization"] = `Bearer ${anonKey}`;
    }

    // NÃO passa body em GET/HEAD
    const fetchOptions = {
      method: event.httpMethod,
      headers,
    };
    if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
      fetchOptions.body = event.body;
    }

    const response = await fetch(targetUrl, fetchOptions);

    // REMOVE headers de encoding
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
