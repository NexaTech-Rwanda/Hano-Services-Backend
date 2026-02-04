const axios = require('axios');

function getEnv(name, def) {
  return process.env[name] != null ? process.env[name] : def;
}

function buildClient() {
  const baseURL = getEnv('API_BASE_URL', 'http://localhost:3000');
  const accessToken = getEnv('ACCESS_TOKEN', '');
  const timeoutMs = Number(getEnv('HTTP_TIMEOUT_MS', '30000'));

  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const client = axios.create({
    baseURL,
    timeout: timeoutMs,
    validateStatus: () => true,
    headers,
  });

  return { client, baseURL, accessToken, timeoutMs };
}

async function request(client, method, url, data, config = {}) {
  const start = Date.now();
  let res;
  try {
    res = await client.request({ method, url, data, ...config });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - start,
      error: err && err.message ? err.message : String(err),
    };
  }

  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    ms: Date.now() - start,
    data: res.data,
  };
}

function logResult(name, result) {
  const base = `${name} -> status=${result.status} timeMs=${result.ms}`;
  if (!result.ok) {
    console.log(`${base} ok=false`);
    if (result.error) console.log(`  error: ${result.error}`);
    if (result.data) console.log(`  body: ${truncate(JSON.stringify(result.data), 800)}`);
    return;
  }

  console.log(`${base} ok=true`);
}

function truncate(s, max) {
  if (!s) return s;
  return s.length > max ? s.slice(0, max) + '...' : s;
}

module.exports = {
  buildClient,
  request,
  logResult,
  truncate,
};
