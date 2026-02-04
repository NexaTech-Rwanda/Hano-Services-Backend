const { buildClient, request } = require('./_client');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function runBatch({ client, name, method, url, body, iterations, concurrency, delayMs }) {
  const times = [];
  let ok = 0;
  let fail = 0;

  let i = 0;
  async function worker() {
    while (true) {
      const my = i++;
      if (my >= iterations) return;
      const r = await request(client, method, url, body);
      times.push(r.ms);
      if (r.ok) ok += 1;
      else fail += 1;
      if (delayMs) await sleep(delayMs);
    }
  }

  const start = Date.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalMs = Date.now() - start;

  return {
    name,
    iterations,
    concurrency,
    ok,
    fail,
    totalMs,
    rps: iterations / (totalMs / 1000),
    p50: percentile(times, 50),
    p90: percentile(times, 90),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    max: Math.max(...times),
  };
}

async function main() {
  const { client, baseURL, accessToken } = buildClient();

  const iterations = Number(process.env.ITERATIONS || '200');
  const concurrency = Number(process.env.CONCURRENCY || '10');
  const delayMs = Number(process.env.DELAY_MS || '0');

  console.log('API load test');
  console.log(`baseURL=${baseURL}`);
  console.log(`auth=${accessToken ? 'yes' : 'no'}`);
  console.log(`iterations=${iterations} concurrency=${concurrency} delayMs=${delayMs}`);

  const target = process.env.LOAD_TARGET || 'providers_search';

  let method = 'GET';
  let url = '/api/providers/search';
  let body = undefined;

  if (target === 'categories_list') {
    method = 'GET';
    url = '/api/categories';
  } else if (target === 'providers_search') {
    const lat = process.env.LATITUDE;
    const lon = process.env.LONGITUDE;
    const maxDistance = process.env.MAX_DISTANCE_KM || '10';
    const serviceCategoryId = process.env.SERVICE_CATEGORY_ID || '';

    const params = [];
    if (serviceCategoryId) params.push(`serviceCategoryId=${encodeURIComponent(serviceCategoryId)}`);
    if (lat && lon) {
      params.push(`latitude=${encodeURIComponent(lat)}`);
      params.push(`longitude=${encodeURIComponent(lon)}`);
      params.push(`maxDistance=${encodeURIComponent(maxDistance)}`);
    }
    url = params.length ? `/api/providers/search?${params.join('&')}` : '/api/providers/search';
  } else if (target === 'user_location') {
    if (!accessToken) {
      console.log('ACCESS_TOKEN is required for user_location load target');
      process.exit(1);
    }
    const lat = Number(process.env.LATITUDE || '-1.9441');
    const lon = Number(process.env.LONGITUDE || '30.0619');
    method = 'POST';
    url = '/api/users/location';
    body = { latitude: lat, longitude: lon };
  } else {
    console.log(`Unknown LOAD_TARGET: ${target}`);
    process.exit(1);
  }

  const report = await runBatch({
    client,
    name: `${method} ${url}`,
    method,
    url,
    body,
    iterations,
    concurrency,
    delayMs,
  });

  console.log('\nReport:');
  console.log(JSON.stringify(report, null, 2));

  if (report.fail > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});
