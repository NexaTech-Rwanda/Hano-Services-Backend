const crypto = require('crypto');
const { buildClient, request, truncate } = require('./_client');

function makeString(bytes) {
  return crypto.randomBytes(bytes).toString('base64');
}

async function probe({ client, name, method, url, baseBody, field, startBytes, maxBytes, stepBytes }) {
  console.log(`\nProbe: ${name}`);
  console.log(`field=${field} startBytes=${startBytes} stepBytes=${stepBytes} maxBytes=${maxBytes}`);

  let lastOk = null;
  for (let size = startBytes; size <= maxBytes; size += stepBytes) {
    const body = { ...(baseBody || {}) };
    body[field] = makeString(size);

    const r = await request(client, method, url, body);
    const line = `sizeBytes=${size} status=${r.status} timeMs=${r.ms} ok=${r.ok}`;
    console.log(line);

    if (!r.ok) {
      if (r.data) {
        console.log(`  body: ${truncate(JSON.stringify(r.data), 400)}`);
      }
      break;
    }

    lastOk = { size, status: r.status, ms: r.ms };
  }

  console.log(`Last OK: ${lastOk ? JSON.stringify(lastOk) : 'none'}`);
}

async function main() {
  const { client, baseURL, accessToken } = buildClient();

  console.log('API payload probe');
  console.log(`baseURL=${baseURL}`);
  console.log(`auth=${accessToken ? 'yes' : 'no'}`);

  const target = process.env.PROBE_TARGET || 'reviews_create';

  const startBytes = Number(process.env.START_BYTES || '1024');
  const stepBytes = Number(process.env.STEP_BYTES || '1024');
  const maxBytes = Number(process.env.MAX_BYTES || String(128 * 1024));

  if (target === 'auth_register') {
    await probe({
      client,
      name: 'POST /api/auth/register (username payload)',
      method: 'POST',
      url: '/api/auth/register',
      baseBody: {
        username: 'probe_user_' + Date.now(),
        phone: process.env.PROBE_PHONE || '+250788000000',
        role: 'customer',
      },
      field: 'email',
      startBytes,
      maxBytes,
      stepBytes,
    });
    return;
  }

  if (target === 'providers_create') {
    if (!accessToken) {
      console.log('ACCESS_TOKEN required');
      process.exit(1);
    }
    const serviceCategoryId = process.env.SERVICE_CATEGORY_ID;
    if (!serviceCategoryId) {
      console.log('SERVICE_CATEGORY_ID required');
      process.exit(1);
    }

    await probe({
      client,
      name: 'POST /api/providers (address payload)',
      method: 'POST',
      url: '/api/providers',
      baseBody: {
        name: 'Probe Provider',
        serviceCategoryId,
        latitude: Number(process.env.LATITUDE || '-1.9441'),
        longitude: Number(process.env.LONGITUDE || '30.0619'),
      },
      field: 'address',
      startBytes,
      maxBytes,
      stepBytes,
    });
    return;
  }

  if (target === 'reviews_create') {
    if (!accessToken) {
      console.log('ACCESS_TOKEN required');
      process.exit(1);
    }
    const bookingId = process.env.BOOKING_ID;
    const providerId = process.env.PROVIDER_ID;
    if (!bookingId || !providerId) {
      console.log('BOOKING_ID and PROVIDER_ID required');
      process.exit(1);
    }

    await probe({
      client,
      name: 'POST /api/reviews (comment payload)',
      method: 'POST',
      url: '/api/reviews',
      baseBody: {
        bookingId,
        rating: 5,
        comment: 'x',
        proofImages: [],
      },
      field: 'comment',
      startBytes,
      maxBytes,
      stepBytes,
    });
    return;
  }

  if (target === 'payments_initiate') {
    const customerId = process.env.CUSTOMER_ID;
    if (!customerId) {
      console.log('CUSTOMER_ID required');
      process.exit(1);
    }

    await probe({
      client,
      name: 'POST /api/payments/initiate (description payload)',
      method: 'POST',
      url: '/api/payments/initiate',
      baseBody: {
        amount: 1000,
        currency: 'RWF',
        customerId,
        channel: 'mobile_money',
        phoneNumber: process.env.PHONE_NUMBER || '+250788000000',
        email: process.env.EMAIL || 'test@example.com',
        description: 'x',
      },
      field: 'description',
      startBytes,
      maxBytes,
      stepBytes,
    });
    return;
  }

  console.log(`Unknown PROBE_TARGET: ${target}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
