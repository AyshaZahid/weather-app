const express = require('express');
const cors = require('cors');
const axios = require('axios');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_NAME = process.env.SERVER_NAME || 'Server 1';
const API_KEY = process.env.API_KEY;

app.use(cors());
app.use(express.json());

app.get('/weather', async (req, res) => {
  const { city } = req.query;

  console.log(`[${SERVER_NAME}] Request received for city: ${city}`);

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`,
    );

    res.json({
      handledBy: SERVER_NAME,
      city: response.data.name,
      country: response.data.sys.country,
      temp: response.data.main.temp,
      feels_like: response.data.main.feels_like,
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      wind: response.data.wind.speed,
    });
  } catch (error) {
    res.status(404).json({ error: 'City not found' });
  }
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`${SERVER_NAME} running on port ${PORT}`);
});
