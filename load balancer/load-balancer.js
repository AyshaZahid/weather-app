const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

// 🔁 Choose algorithm here
let STRATEGY = 'least_conn'; // 'round_robin' | 'least_conn' | 'ip_hash'

// Backend servers
const servers = [
  {
    url: 'http://localhost:3001',
    isHealthy: true,
    active: 0,
    name: 'Server 1',
    totalRequests: 0,
    totalFailures: 0,
    totalResponseTime: 0,
  },
  {
    url: 'http://localhost:3002',
    isHealthy: true,
    active: 0,
    name: 'Server 2',
    totalRequests: 0,
    totalFailures: 0,
    totalResponseTime: 0,
  },
  {
    url: 'http://localhost:3003',
    isHealthy: true,
    active: 0,
    name: 'Server 3',
    totalRequests: 0,
    totalFailures: 0,
    totalResponseTime: 0,
  },
];

let currentIndex = 0;

app.use(cors());
app.use(express.json());

/* =========================
   🧠 LOAD BALANCING LOGIC
========================= */

// Round Robin
function roundRobin() {
  let attempts = 0;

  while (attempts < servers.length) {
    const server = servers[currentIndex];
    currentIndex = (currentIndex + 1) % servers.length;

    if (server.isHealthy) return server;

    attempts++;
  }

  return null;
}

// Least Connections 🔥
function leastConnections() {
  const healthyServers = servers.filter((s) => s.isHealthy);
  if (!healthyServers.length) return null;

  let min = Infinity;
  let candidates = [];

  for (let server of healthyServers) {
    if (server.active < min) {
      min = server.active;
      candidates = [server];
    } else if (server.active === min) {
      candidates.push(server);
    }
  }

  // ✅ pick randomly ONLY among equal candidates
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Sticky Sessions (IP Hash)
function ipHash(ip) {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash += ip.charCodeAt(i);
  }
  return servers[hash % servers.length];
}

// Strategy selector
function getServer(req) {
  if (STRATEGY === 'least_conn') return leastConnections();
  if (STRATEGY === 'ip_hash') return ipHash(req.ip);
  return roundRobin();
}

/* =========================
   🌐 MAIN ROUTE
========================= */

app.get('/api/weather', async (req, res) => {
  let attempts = 0;

  while (attempts < servers.length) {
    const server = getServer(req);

    if (!server) {
      return res.status(503).json({ error: 'All servers are down' });
    }

    const start = Date.now();
    server.active++;
    server.totalRequests++;

    try {
      console.log(`➡️ [${STRATEGY}] Routing to ${server.name}`);

      const response = await fetch(
        `${server.url}/weather?city=${req.query.city}`,
      );

      const data = await response.json();
      const duration = Date.now() - start;
      server.totalResponseTime += duration;

      return res.json({
        ...data,
        routedBy: `Custom LB (${STRATEGY})`,
        serverUsed: server.name,
        responseTime: `${duration}ms`,
      });
    } catch (error) {
      server.isHealthy = false;
      server.totalFailures++;
      console.log(`❌ ${server.name} failed`);
      attempts++;
    } finally {
      server.active--; // always runs, no matter what
    }
  }

  res.status(500).json({ error: 'All servers failed' });
});

/* =========================
   ❤️ HEALTH CHECK
========================= */

setInterval(async () => {
  for (let server of servers) {
    try {
      const res = await fetch(`${server.url}/health`);

      if (!res.ok) throw new Error('Bad health response');

      if (!server.isHealthy) {
        console.log(`✅ ${server.name} recovered`);
      }

      server.isHealthy = true;
    } catch (err) {
      if (server.isHealthy) {
        console.log(`❌ ${server.name} went down`);
      }

      server.isHealthy = false;
    }
  }
}, 5000);
/* =========================
   📊 METRICS API
========================= */

app.get('/metrics', (req, res) => {
  const result = servers.map((s) => ({
    name: s.name,
    activeConnections: s.active,
    totalRequests: s.totalRequests,
    failures: s.totalFailures,
    avgResponseTime: s.totalRequests
      ? (s.totalResponseTime / s.totalRequests).toFixed(2) + 'ms'
      : '0ms',
    isHealthy: s.isHealthy,
  }));

  res.json({
    strategy: STRATEGY,
    servers: result,
  });
});

// Add this after your metrics endpoint
app.post('/strategy', (req, res) => {
  const { strategy } = req.body;
  const valid = ['round_robin', 'least_conn', 'ip_hash'];
  if (!valid.includes(strategy)) {
    return res.status(400).json({ error: 'Invalid strategy' });
  }
  STRATEGY = strategy;
  res.json({ strategy: STRATEGY });
});

app.listen(PORT, () => {
  console.log(`🚀 Load Balancer running on http://localhost:${PORT}`);
});
