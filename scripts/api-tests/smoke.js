const { buildClient, request, logResult } = require('./_client');

function envList(name) {
  const v = process.env[name];
  if (!v) return [];
  return v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

async function main() {
  const { client, baseURL, accessToken } = buildClient();

  console.log('API smoke tests');
  console.log(`baseURL=${baseURL}`);
  console.log(`auth=${accessToken ? 'yes' : 'no'}`);

  const results = [];

  results.push(['GET /health', await request(client, 'GET', '/health')]);
  results.push(['GET /api', await request(client, 'GET', '/api')]);

  results.push(['GET /api/categories', await request(client, 'GET', '/api/categories')]);

  const providerId = process.env.PROVIDER_ID || '';
  if (providerId) {
    results.push([
      'GET /api/providers/:id',
      await request(client, 'GET', `/api/providers/${providerId}`),
    ]);
    results.push([
      'GET /api/providers/:id/portfolio',
      await request(client, 'GET', `/api/providers/${providerId}/portfolio`),
    ]);

    results.push([
      'GET /api/reviews/provider/:providerId',
      await request(client, 'GET', `/api/reviews/provider/${providerId}?limit=5`),
    ]);
  } else {
    console.log('Skipping providerId-dependent tests (set PROVIDER_ID env var).');
  }

  // Provider search (no auth)
  const searchParams = [];
  const serviceCategoryId = process.env.SERVICE_CATEGORY_ID || '';
  if (serviceCategoryId) searchParams.push(`serviceCategoryId=${encodeURIComponent(serviceCategoryId)}`);

  const lat = process.env.LATITUDE;
  const lon = process.env.LONGITUDE;
  if (lat && lon) {
    searchParams.push(`latitude=${encodeURIComponent(lat)}`);
    searchParams.push(`longitude=${encodeURIComponent(lon)}`);
    searchParams.push(`maxDistance=${encodeURIComponent(process.env.MAX_DISTANCE_KM || '10')}`);
  }

  const qs = searchParams.length ? `?${searchParams.join('&')}` : '';
  results.push([
    'GET /api/providers/search',
    await request(client, 'GET', `/api/providers/search${qs}`),
  ]);

  // Auth-required endpoints (optional)
  if (accessToken) {
    results.push([
      'POST /api/auth/logout',
      await request(client, 'POST', '/api/auth/logout'),
    ]);

    if (lat && lon) {
      results.push([
        'POST /api/users/location',
        await request(client, 'POST', '/api/users/location', {
          latitude: Number(lat),
          longitude: Number(lon),
        }),
      ]);
    } else {
      console.log('Skipping /api/users/location (set LATITUDE & LONGITUDE env vars).');
    }
  } else {
    console.log('Skipping auth-required smoke tests (set ACCESS_TOKEN env var).');
  }

  // Payments
  const reference = process.env.PAYMENT_REFERENCE || '';
  if (reference) {
    results.push([
      'GET /api/payments/:reference/status',
      await request(client, 'GET', `/api/payments/${reference}/status`),
    ]);
  } else {
    console.log('Skipping payment status (set PAYMENT_REFERENCE env var).');
  }

  // Print
  console.log('\nResults:');
  for (const [name, r] of results) {
    logResult(name, r);
  }

  const failed = results.filter(([, r]) => !r.ok);
  if (failed.length) {
    console.log(`\nFailed: ${failed.length}/${results.length}`);
    process.exit(1);
  }

  console.log(`\nAll passed: ${results.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
