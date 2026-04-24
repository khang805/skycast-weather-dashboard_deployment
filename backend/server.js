const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Geocoding endpoint - converts city name to lat/lon
app.get('/api/geocode', async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'City parameter is required' });

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    res.json(data.results);
  } catch (err) {
    console.error('Geocode error:', err.message);
    res.status(500).json({ error: 'Failed to geocode city' });
  }
});

// Current weather + 7-day forecast endpoint using Open-Meteo (no API key needed)
app.get('/api/weather', async (req, res) => {
  const { lat, lon, city } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon parameters are required' });
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,` +
      `weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,visibility` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,` +
      `wind_speed_10m_max,uv_index_max,precipitation_probability_max` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&timezone=auto&forecast_days=7`;

    const response = await fetch(weatherUrl);
    const data = await response.json();

    // Map WMO weather codes to descriptions and icons
    const weatherInfo = getWeatherInfo(data.current.weather_code, data.current.is_day);

    const formatted = {
      city: city || 'Unknown',
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      timezone: data.timezone,
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feels_like: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        wind_speed: Math.round(data.current.wind_speed_10m),
        wind_direction: data.current.wind_direction_10m,
        wind_gusts: Math.round(data.current.wind_gusts_10m),
        cloud_cover: data.current.cloud_cover,
        visibility: data.current.visibility != null ? Math.round(data.current.visibility / 1000) : null,
        pressure: Math.round(data.current.surface_pressure),
        precipitation: data.current.precipitation,
        is_day: data.current.is_day,
        weather_code: data.current.weather_code,
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        bg_class: weatherInfo.bg_class,
      },
      daily: data.daily.time.map((date, i) => ({
        date,
        weather_code: data.daily.weather_code[i],
        temp_max: Math.round(data.daily.temperature_2m_max[i]),
        temp_min: Math.round(data.daily.temperature_2m_min[i]),
        sunrise: data.daily.sunrise[i],
        sunset: data.daily.sunset[i],
        precipitation: data.daily.precipitation_sum[i],
        precipitation_prob: data.daily.precipitation_probability_max[i],
        wind_max: Math.round(data.daily.wind_speed_10m_max[i]),
        uv_index: data.daily.uv_index_max[i],
        ...getWeatherInfo(data.daily.weather_code[i], 1),
      })),
      hourly: data.hourly.time.slice(0, 24).map((time, i) => ({
        time,
        temperature: Math.round(data.hourly.temperature_2m[i]),
        precipitation_prob: data.hourly.precipitation_probability[i],
        weather_code: data.hourly.weather_code[i],
        ...getWeatherInfo(data.hourly.weather_code[i], 1),
      })),
    };

    res.json(formatted);
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'weather-backend' }));

// WMO Weather Code mapping
function getWeatherInfo(code, isDay = 1) {
  const map = {
    0:  { description: 'Clear Sky',           icon: isDay ? '☀️' : '🌙',  bg_class: 'clear' },
    1:  { description: 'Mainly Clear',        icon: isDay ? '🌤️' : '🌙',  bg_class: 'clear' },
    2:  { description: 'Partly Cloudy',       icon: '⛅',                  bg_class: 'cloudy' },
    3:  { description: 'Overcast',            icon: '☁️',                  bg_class: 'overcast' },
    45: { description: 'Foggy',               icon: '🌫️',                  bg_class: 'fog' },
    48: { description: 'Icy Fog',             icon: '🌫️',                  bg_class: 'fog' },
    51: { description: 'Light Drizzle',       icon: '🌦️',                  bg_class: 'rain' },
    53: { description: 'Drizzle',             icon: '🌦️',                  bg_class: 'rain' },
    55: { description: 'Heavy Drizzle',       icon: '🌧️',                  bg_class: 'rain' },
    61: { description: 'Slight Rain',         icon: '🌧️',                  bg_class: 'rain' },
    63: { description: 'Moderate Rain',       icon: '🌧️',                  bg_class: 'rain' },
    65: { description: 'Heavy Rain',          icon: '🌧️',                  bg_class: 'rain' },
    71: { description: 'Slight Snow',         icon: '🌨️',                  bg_class: 'snow' },
    73: { description: 'Moderate Snow',       icon: '❄️',                  bg_class: 'snow' },
    75: { description: 'Heavy Snow',          icon: '❄️',                  bg_class: 'snow' },
    77: { description: 'Snow Grains',         icon: '🌨️',                  bg_class: 'snow' },
    80: { description: 'Slight Rain Showers', icon: '🌦️',                  bg_class: 'rain' },
    81: { description: 'Moderate Showers',    icon: '🌧️',                  bg_class: 'rain' },
    82: { description: 'Violent Showers',     icon: '⛈️',                  bg_class: 'storm' },
    85: { description: 'Snow Showers',        icon: '🌨️',                  bg_class: 'snow' },
    86: { description: 'Heavy Snow Showers',  icon: '❄️',                  bg_class: 'snow' },
    95: { description: 'Thunderstorm',        icon: '⛈️',                  bg_class: 'storm' },
    96: { description: 'Thunderstorm + Hail', icon: '⛈️',                  bg_class: 'storm' },
    99: { description: 'Severe Thunderstorm', icon: '🌩️',                  bg_class: 'storm' },
  };
  return map[code] || { description: 'Unknown', icon: '🌡️', bg_class: 'clear' };
}

app.listen(PORT, () => {
  console.log(`✅ Weather Backend running on http://localhost:${PORT}`);
  console.log(`   Powered by Open-Meteo (no API key required)`);
});
