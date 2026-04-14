import { useState } from 'react';
import WeatherApp from './WeatherApp';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [tab, setTab] = useState('weather');

  return (
    <div>
      <div className='tab-bar'>
        <button
          className={`tab-btn ${tab === 'weather' ? 'active' : ''}`}
          onClick={() => setTab('weather')}
        >
          Weather App
        </button>
        <button
          className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setTab('dashboard')}
        >
          LB Dashboard
        </button>
      </div>
      {tab === 'weather' ? <WeatherApp /> : <Dashboard />}
    </div>
  );
}

export default App;
