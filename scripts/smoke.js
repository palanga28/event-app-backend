const axios = require('axios');

function assertEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing env var: ${name}`);
  }
  return process.env[name];
}

function nowId() {
  return Date.now().toString();
}

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  const adminEmail = assertEnv('ADMIN_EMAIL');
  const adminPassword = assertEnv('ADMIN_PASSWORD');
  const modEmail = assertEnv('MOD_EMAIL');
  const modPassword = assertEnv('MOD_PASSWORD');

  const email = `smoke_${nowId()}@example.com`;
  const password = 'Password123!';

  console.log(`[1] Register user ${email}`);
  await axios.post(`${baseUrl}/api/auth/register`, {
    name: 'Smoke User',
    email,
    password
  });

  console.log('[2] Login user');
  const login = await axios.post(`${baseUrl}/api/auth/login`, { email, password });
  const accessToken = login.data?.accessToken;
  if (!accessToken) {
    throw new Error('No accessToken returned by /api/auth/login');
  }

  const userHeaders = { Authorization: `Bearer ${accessToken}` };

  console.log('[3] Create event');
  const startDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const createdEvent = await axios.post(
    `${baseUrl}/api/events`,
    { title: 'Smoke Event', description: 'E2E smoke', startDate, endDate, location: 'Test' },
    { headers: userHeaders }
  );
  const eventId = createdEvent.data?.event?.id;
  if (!eventId) {
    throw new Error('No eventId returned by POST /api/events');
  }
  console.log(`EventId=${eventId}`);

  console.log('[4] Create report');
  const createdReport = await axios.post(
    `${baseUrl}/api/reports`,
    { type: 'event', targetId: eventId, reason: 'Spam' },
    { headers: userHeaders }
  );
  const reportId = createdReport.data?.report?.id;
  if (!reportId) {
    throw new Error('No reportId returned by POST /api/reports');
  }
  console.log(`ReportId=${reportId}`);

  console.log('[5] Login moderator');
  const modLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: modEmail,
    password: modPassword
  });
  const modToken = modLogin.data?.accessToken;
  if (!modToken) {
    throw new Error('No accessToken returned for moderator');
  }
  const modHeaders = { Authorization: `Bearer ${modToken}` };

  console.log('[6] Resolve report');
  await axios.put(
    `${baseUrl}/api/moderator/reports/${reportId}/resolve`,
    { action: 'dismiss', reason: 'OK' },
    { headers: modHeaders }
  );

  console.log('[7] Login admin');
  const adminLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: adminEmail,
    password: adminPassword
  });
  const adminToken = adminLogin.data?.accessToken;
  if (!adminToken) {
    throw new Error('No accessToken returned for admin');
  }
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  console.log('[8] Feature event');
  await axios.put(
    `${baseUrl}/api/admin/events/${eventId}/feature`,
    { featured: true },
    { headers: adminHeaders }
  );

  console.log('[9] Fetch admin logs (check event_featured)');
  const logsResp = await axios.get(`${baseUrl}/api/admin/logs?action=event_featured&limit=50&offset=0`, {
    headers: adminHeaders
  });

  const logs = Array.isArray(logsResp.data) ? logsResp.data : logsResp.data?.value;
  const found = Array.isArray(logs)
    ? logs.find((l) => l.action === 'event_featured' && String(l.entity_id) === String(eventId))
    : null;

  if (!found) {
    throw new Error('Audit log not found for event_featured');
  }

  console.log('SMOKE TEST PASSED');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('SMOKE TEST FAILED');
    console.error(err?.response?.data || err?.message || err);
    process.exit(1);
  });
