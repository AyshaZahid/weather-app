const axios = require('axios');

const LB_URL = 'http://localhost:8080/api/weather';

// 🌍 simulate real user traffic
const cities = [
  'lahore',
  'karachi',
  'islamabad',
  'london',
  'dubai',
  'new york',
  'paris',
  'tokyo',
];

const TOTAL_REQUESTS = 2000;
const CONCURRENCY = 100;

let success = 0;
let fail = 0;

let serverHits = {};
let responseTimes = [];

function randomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

async function sendRequest(i) {
  const city = randomCity();
  const start = Date.now();

  try {
    const res = await axios.get(`${LB_URL}?city=${city}`);
    const time = Date.now() - start;

    success++;
    responseTimes.push(time);

    const server = res.data.serverUsed;
    serverHits[server] = (serverHits[server] || 0) + 1;

    console.log(`✅ Req ${i} → ${server} | ${city} | ${time}ms`);
  } catch (err) {
    fail++;
    console.log(`❌ Req ${i} failed`);
  }
}

async function runBatch(start, end) {
  const batch = [];

  for (let i = start; i < end; i++) {
    batch.push(sendRequest(i));
  }

  await Promise.all(batch);
}

async function runTest() {
  console.log('🔥 STRESS TEST STARTING...\n');

  const batches = TOTAL_REQUESTS / CONCURRENCY;

  for (let i = 0; i < batches; i++) {
    const start = i * CONCURRENCY;
    const end = start + CONCURRENCY;

    await runBatch(start, end);
  }

  // 📊 FINAL REPORT
  console.log('\n======================');
  console.log('📊 FINAL REPORT');
  console.log('======================');
  console.log('Total Requests:', TOTAL_REQUESTS);
  console.log('Success:', success);
  console.log('Failed:', fail);

  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

  console.log('Avg Response Time:', avg.toFixed(2) + 'ms');

  console.log('\n📦 Server Distribution:');
  console.log(serverHits);

  console.log('\n📈 Performance Insight:');

  const max = Math.max(...Object.values(serverHits));
  const min = Math.min(...Object.values(serverHits));

  console.log('Load Imbalance Score:', max - min);
}

runTest();
