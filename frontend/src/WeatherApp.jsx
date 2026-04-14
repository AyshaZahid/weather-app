import { useState } from 'react';
import './WeatherApp.css';

function WeatherApp() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchWeather = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);

    try {
     const res = await fetch(`${process.env.REACT_APP_LB_URL}/api/weather?city=${city}`);
      const data = await res.json();

      if (data.error) {
        setError('City not found. Try again!');
        setWeather(null);
      } else {
        setWeather(data);
        setHistory((prev) => [
          {
            city: data.city,
            server: data.handledBy,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 4),
        ]);
      }
    } catch (err) {
      setError('Something went wrong. Is the server running?');
    }

    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') fetchWeather();
  };

  return (
    <div className='app'>
      <div className='container'>
        <div className='header'>
          <h1>Weather App</h1>
          <p className='subtitle'>
            Powered by Load Balancing - watch which server handles your request!
          </p>
        </div>

        <div className='search-box'>
          <input
            type='text'
            placeholder='Enter city name...'
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKey}
          />
          <button onClick={fetchWeather} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <div className='error'>{error}</div>}

        {weather && (
          <div className='weather-card'>
            <div className='server-badge'>Handled by: {weather.handledBy}</div>
            <div className='weather-main'>
              <img
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
              />
              <div className='temp'>{Math.round(weather.temp)}°C</div>
            </div>
            <div className='city-name'>
              {weather.city}, {weather.country}
            </div>
            <div className='description'>{weather.description}</div>
            <div className='details'>
              <div className='detail-item'>
                <span className='label'>Feels like</span>
                <span className='value'>
                  {Math.round(weather.feels_like)}°C
                </span>
              </div>
              <div className='detail-item'>
                <span className='label'>Humidity</span>
                <span className='value'>{weather.humidity}%</span>
              </div>
              <div className='detail-item'>
                <span className='label'>Wind</span>
                <span className='value'>{weather.wind} m/s</span>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className='history'>
            <h3>Request History - See Load Balancing in Action!</h3>
            <div className='history-list'>
              {history.map((item, i) => (
                <div key={i} className='history-item'>
                  <span className='history-city'>{item.city}</span>
                  <span className='history-server'>{item.server}</span>
                  <span className='history-time'>{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherApp;
