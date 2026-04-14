import { useState, useEffect, useRef } from 'react';
import './Dashboard.css';

const METRICS_URL = `${process.env.REACT_APP_LB_URL}/metrics`;
const STRATEGY_URL = `${process.env.REACT_APP_LB_URL}/strategy`;

const STRATEGY_INFO = {
  round_robin: 'Sends requests to each server in order, one by one.',
  least_conn: 'Picks the server with fewest active connections right now.',
  ip_hash: 'Same user always goes to same server based on their IP.',
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [strategy, setStrategy] = useState('least_conn');
  const [history, setHistory] = useState([]);
  const [changing, setChanging] = useState(false);
  const intervalRef = useRef(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(METRICS_URL);
      const data = await res.json();
      setMetrics(data);
      setStrategy(data.strategy);
      setHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          servers: data.servers.map(s => ({
            name: s.name,
            requests: s.totalRequests,
            active: s.activeConnections,
          })),
        };
        return [...prev.slice(-20), newEntry];
      });
    } catch (err) {
      // load balancer not running
    }
  };

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 2000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const changeStrategy = async (s) => {
    setChanging(true);
    try {
      await fetch(STRATEGY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: s }),
      });
      setStrategy(s);
    } catch (err) {}
    setChanging(false);
  };

  const totalRequests = metrics
    ? metrics.servers.reduce((a, s) => a + s.totalRequests, 0)
    : 0;

  const totalFailures = metrics
    ? metrics.servers.reduce((a, s) => a + s.failures, 0)
    : 0;

  const healthyCount = metrics
    ? metrics.servers.filter(s => s.isHealthy).length
    : 0;

  return (
    <div className='dash'>

      {/* HEADER */}
      <div className='dash-header'>
        <div>
          <h1 className='dash-title'>Load Balancer Dashboard</h1>
          <p className='dash-sub'>Live metrics — refreshes every 2 seconds</p>
        </div>
        <div className='dash-live'>
          <span className='live-dot' />
          LIVE
        </div>
      </div>

      {/* TOP STATS */}
      <div className='stat-row'>
        <div className='stat-card'>
          <div className='stat-label'>Total Requests</div>
          <div className='stat-value'>{totalRequests}</div>
        </div>
        <div className='stat-card'>
          <div className='stat-label'>Active Servers</div>
          <div className='stat-value green'>{healthyCount} / {metrics?.servers.length ?? 3}</div>
        </div>
        <div className='stat-card'>
          <div className='stat-label'>Total Failures</div>
          <div className='stat-value red'>{totalFailures}</div>
        </div>
        <div className='stat-card'>
          <div className='stat-label'>Strategy</div>
          <div className='stat-value cyan'>{strategy.replace('_', ' ')}</div>
        </div>
      </div>

      {/* STRATEGY SWITCHER */}
      <div className='section'>
        <div className='section-title'>Algorithm</div>
        <div className='strategy-row'>
          {['round_robin', 'least_conn', 'ip_hash'].map(s => (
            <button
              key={s}
              className={`strategy-btn ${strategy === s ? 'active' : ''}`}
              onClick={() => changeStrategy(s)}
              disabled={changing}
            >
              <div className='strategy-name'>
                {s === 'round_robin' ? 'Round Robin' : s === 'least_conn' ? 'Least Connections' : 'IP Hash'}
              </div>
              <div className='strategy-desc'>{STRATEGY_INFO[s]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* SERVER CARDS */}
      <div className='section'>
        <div className='section-title'>Servers</div>
        <div className='server-grid'>
          {metrics?.servers.map((server, i) => {
            const pct = totalRequests > 0
              ? ((server.totalRequests / totalRequests) * 100).toFixed(1)
              : 0;
            return (
              <div key={i} className={`server-card ${!server.isHealthy ? 'down' : ''}`}>
                <div className='server-top'>
                  <div className='server-name'>{server.name}</div>
                  <div className={`server-status ${server.isHealthy ? 'healthy' : 'unhealthy'}`}>
                    <span className='status-dot' />
                    {server.isHealthy ? 'Healthy' : 'Down'}
                  </div>
                </div>

                <div className='server-bar-wrap'>
                  <div
                    className='server-bar'
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className='server-pct'>{pct}% of traffic</div>

                <div className='server-stats'>
                  <div className='server-stat'>
                    <span className='server-stat-label'>Requests</span>
                    <span className='server-stat-val'>{server.totalRequests}</span>
                  </div>
                  <div className='server-stat'>
                    <span className='server-stat-label'>Active</span>
                    <span className='server-stat-val cyan'>{server.activeConnections}</span>
                  </div>
                  <div className='server-stat'>
                    <span className='server-stat-label'>Avg Time</span>
                    <span className='server-stat-val'>{server.avgResponseTime}</span>
                  </div>
                  <div className='server-stat'>
                    <span className='server-stat-label'>Failures</span>
                    <span className='server-stat-val red'>{server.failures}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REQUEST HISTORY GRAPH */}
      <div className='section'>
        <div className='section-title'>Request Distribution Over Time</div>
        <div className='history-graph'>
          {history.slice(-15).map((entry, i) => (
            <div key={i} className='graph-col'>
              {entry.servers.map((s, j) => (
                <div
                  key={j}
                  className={`graph-bar bar-${j}`}
                  style={{ height: `${Math.min(s.requests * 2, 100)}px` }}
                  title={`${s.name}: ${s.requests} requests`}
                />
              ))}
              <div className='graph-time'>{entry.time.split(':').slice(1).join(':')}</div>
            </div>
          ))}
        </div>
        <div className='graph-legend'>
          {metrics?.servers.map((s, i) => (
            <div key={i} className='legend-item'>
              <div className={`legend-dot dot-${i}`} />
              {s.name}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}