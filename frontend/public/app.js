/* ============================================================
   SkyCast — app.js
   Frontend logic: search, API calls, rendering
   ============================================================ */

// ── Config ──────────────────────────────────────────────────
const BACKEND_URL = window.BACKEND_URL || 'http://localhost:5000';
let isCelsius = true;
let currentData = null;
let searchTimeout = null;
let selectedSuggestionIndex = -1;

// ── DOM Refs ─────────────────────────────────────────────────
const cityInput        = document.getElementById('city-input');
const searchBtn        = document.getElementById('search-btn');
const suggestionsEl    = document.getElementById('suggestions-dropdown');
const loadingEl        = document.getElementById('loading-overlay');
const errorCard        = document.getElementById('error-card');
const weatherContent   = document.getElementById('weather-content');
const unitToggle       = document.getElementById('unit-toggle');
const appBody          = document.getElementById('app-body');
const bgGradient       = document.getElementById('bg-gradient');
const currentTimeEl    = document.getElementById('current-time');

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  loadDefaultCity();
  setupEventListeners();
});

function loadDefaultCity() {
  // Try to get user's location via browser geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, 'Your Location'),
      () => fetchWeatherByCity('Islamabad') // fallback
    );
  } else {
    fetchWeatherByCity('Islamabad');
  }
}

function setupEventListeners() {
  searchBtn.addEventListener('click', handleSearch);
  cityInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'ArrowDown') navigateSuggestion(1);
    if (e.key === 'ArrowUp')   navigateSuggestion(-1);
    if (e.key === 'Escape')    closeSuggestions();
  });

  cityInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const val = cityInput.value.trim();
    if (val.length < 2) { closeSuggestions(); return; }
    searchTimeout = setTimeout(() => fetchSuggestions(val), 300);
  });

  unitToggle.addEventListener('change', () => {
    isCelsius = !unitToggle.checked;
    if (currentData) renderAll(currentData);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) closeSuggestions();
  });
}

// ── Clock ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  currentTimeEl.textContent = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// ── Temperature conversion ───────────────────────────────────
function displayTemp(c) {
  if (isCelsius) return `${Math.round(c)}°C`;
  return `${Math.round(c * 9/5 + 32)}°F`;
}

// ── Search ────────────────────────────────────────────────────
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return;
  closeSuggestions();
  await fetchWeatherByCity(city);
}

async function fetchWeatherByCity(city) {
  showLoading();
  try {
    const geoRes = await fetch(`${BACKEND_URL}/api/geocode?city=${encodeURIComponent(city)}`);
    if (!geoRes.ok) throw new Error('City not found');
    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) throw new Error('City not found');

    const { latitude, longitude, name, country } = geoData[0];
    const displayName = `${name}, ${country}`;
    await fetchWeatherByCoords(latitude, longitude, displayName);
  } catch (err) {
    showError(err.message);
  }
}

async function fetchWeatherByCoords(lat, lon, cityName) {
  showLoading();
  try {
    const res = await fetch(`${BACKEND_URL}/api/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(cityName)}`);
    if (!res.ok) throw new Error('Failed to fetch weather');
    const data = await res.json();
    currentData = data;
    renderAll(data);
    showWeather();
  } catch (err) {
    showError(err.message || 'Could not load weather data');
  }
}

// ── Suggestions ───────────────────────────────────────────────
async function fetchSuggestions(query) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/geocode?city=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const results = await res.json();
    renderSuggestions(results);
  } catch { /* ignore */ }
}

function renderSuggestions(results) {
  if (!results || results.length === 0) { closeSuggestions(); return; }
  suggestionsEl.innerHTML = '';
  suggestionsEl.classList.add('open');
  selectedSuggestionIndex = -1;

  results.slice(0, 5).forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.setAttribute('role', 'option');
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
      <span>📍</span>
      <span>${r.name}${r.admin1 ? ', ' + r.admin1 : ''}</span>
      <span class="suggestion-country">${r.country}</span>
    `;
    div.addEventListener('click', () => {
      cityInput.value = r.name;
      closeSuggestions();
      fetchWeatherByCoords(r.latitude, r.longitude, `${r.name}, ${r.country}`);
    });
    suggestionsEl.appendChild(div);
  });
}

function navigateSuggestion(dir) {
  const items = suggestionsEl.querySelectorAll('.suggestion-item');
  if (!items.length) return;
  items[selectedSuggestionIndex]?.classList.remove('active');
  selectedSuggestionIndex = Math.max(0, Math.min(items.length - 1, selectedSuggestionIndex + dir));
  items[selectedSuggestionIndex].classList.add('active');
}

function closeSuggestions() {
  suggestionsEl.classList.remove('open');
  suggestionsEl.innerHTML = '';
  selectedSuggestionIndex = -1;
}

// ── UI State ──────────────────────────────────────────────────
function showLoading() {
  loadingEl.style.display = 'flex';
  errorCard.style.display = 'none';
  weatherContent.style.display = 'none';
}

function showWeather() {
  loadingEl.style.display = 'none';
  errorCard.style.display = 'none';
  weatherContent.style.display = 'block';
}

function showError(msg) {
  loadingEl.style.display = 'none';
  weatherContent.style.display = 'none';
  errorCard.style.display = 'block';
  document.getElementById('error-message').textContent = msg;
}

// ── Render All ────────────────────────────────────────────────
function renderAll(data) {
  renderCurrent(data);
  renderHourly(data.hourly);
  renderDaily(data.daily);
  renderDetails(data);
  applyBgClass(data.current.bg_class, data.current.is_day);
}

// ── Current Weather ───────────────────────────────────────────
function renderCurrent(data) {
  const c = data.current;
  const today = data.daily[0];

  document.getElementById('city-name').textContent   = data.city;
  document.getElementById('city-coords').textContent = `${data.latitude.toFixed(2)}°N, ${data.longitude.toFixed(2)}°E`;
  document.getElementById('weather-icon-main').textContent = c.icon;
  document.getElementById('current-temp').textContent      = displayTemp(c.temperature);
  document.getElementById('current-desc').textContent      = c.description;
  document.getElementById('feels-like').textContent        = displayTemp(c.feels_like);

  document.getElementById('humidity-val').textContent    = `${c.humidity}%`;
  document.getElementById('wind-val').textContent        = `${c.wind_speed} km/h`;
  document.getElementById('pressure-val').textContent    = `${c.pressure} hPa`;
  document.getElementById('visibility-val').textContent  = c.visibility != null ? `${c.visibility} km` : 'N/A';
  document.getElementById('cloud-val').textContent       = `${c.cloud_cover}%`;
  document.getElementById('uv-val').textContent          = today.uv_index ? today.uv_index.toFixed(1) : '--';

  // Sunrise / Sunset
  document.getElementById('sunrise').textContent = formatTime(today.sunrise);
  document.getElementById('sunset').textContent  = formatTime(today.sunset);
}

// ── Hourly ────────────────────────────────────────────────────
function renderHourly(hourly) {
  const container = document.getElementById('hourly-scroll');
  container.innerHTML = '';
  const now = new Date();
  const nowHour = now.getHours();

  hourly.slice(0, 24).forEach((h, i) => {
    const dt = new Date(h.time);
    const isNow = dt.getHours() === nowHour && dt.toDateString() === now.toDateString();

    const card = document.createElement('div');
    card.className = `hourly-card${isNow ? ' now' : ''}`;
    card.innerHTML = `
      <div class="hourly-time">${isNow ? 'Now' : formatHour(h.time)}</div>
      <div class="hourly-icon">${h.icon}</div>
      <div class="hourly-temp">${displayTemp(h.temperature)}</div>
      <div class="hourly-rain">💧 ${h.precipitation_prob}%</div>
    `;
    container.appendChild(card);
  });
}

// ── Daily ─────────────────────────────────────────────────────
function renderDaily(daily) {
  const container = document.getElementById('daily-grid');
  container.innerHTML = '';
  const today = new Date().toDateString();

  daily.forEach((d, i) => {
    const date = new Date(d.date);
    const isToday = date.toDateString() === today;
    const uvColor = getUVColor(d.uv_index);

    const card = document.createElement('div');
    card.className = `daily-card${isToday ? ' today' : ''}`;
    card.innerHTML = `
      <div class="daily-day">${isToday ? 'Today' : getDayName(d.date)}</div>
      <span class="daily-icon">${d.icon}</span>
      <div class="daily-temps">
        <span class="daily-max">${displayTemp(d.temp_max)}</span>
        <span class="daily-min">${displayTemp(d.temp_min)}</span>
      </div>
      <div class="daily-rain">💧 ${d.precipitation_prob || 0}%</div>
      <div class="daily-uv" style="color:${uvColor}">UV ${d.uv_index ? d.uv_index.toFixed(0) : '--'}</div>
    `;
    container.appendChild(card);
  });
}

// ── Details ───────────────────────────────────────────────────
function renderDetails(data) {
  const c = data.current;
  const today = data.daily[0];

  // Wind compass
  document.getElementById('wind-detail').textContent = `${c.wind_speed} km/h`;
  document.getElementById('wind-gusts').textContent  = `Gusts: ${c.wind_gusts} km/h`;
  const needle = document.getElementById('compass-needle');
  setTimeout(() => { needle.style.transform = `translateX(-50%) rotate(${c.wind_direction - 180}deg)`; }, 100);

  // Precipitation
  const precip = today.precipitation || 0;
  const precipProb = today.precipitation_prob || 0;
  document.getElementById('precip-val').textContent  = `${precip.toFixed(1)} mm`;
  document.getElementById('precip-prob').textContent = `Chance: ${precipProb}%`;
  setTimeout(() => {
    document.getElementById('precip-bar-fill').style.width = `${Math.min(precipProb, 100)}%`;
  }, 200);

  // UV Index
  const uv = today.uv_index || 0;
  document.getElementById('uv-detail').textContent = uv.toFixed(1);
  const cat = getUVCategory(uv);
  document.getElementById('uv-category').textContent = cat;
  const uvDeg = Math.min((uv / 11) * 180, 180) - 90;
  setTimeout(() => {
    document.getElementById('uv-needle').style.transform = `translateX(-50%) rotate(${uvDeg}deg)`;
  }, 100);

  // Humidity ring
  const humPerc = c.humidity;
  const humCirc = 2 * Math.PI * 24;
  const humOff  = humCirc - (humPerc / 100) * humCirc;
  document.getElementById('hum-center').textContent = `${humPerc}%`;
  setTimeout(() => {
    document.getElementById('humidity-ring').setAttribute('stroke-dasharray', `${(humPerc / 100) * humCirc} ${humCirc}`);
  }, 200);

  // Pressure ring (normalised roughly 950-1050)
  const pres = c.pressure;
  const presPerc = Math.min(Math.max(((pres - 950) / 100) * 100, 0), 100);
  const presCirc = 2 * Math.PI * 24;
  document.getElementById('pres-center').textContent = pres;
  setTimeout(() => {
    document.getElementById('pressure-ring').setAttribute('stroke-dasharray', `${(presPerc / 100) * presCirc} ${presCirc}`);
  }, 200);
}

// ── Background ────────────────────────────────────────────────
function applyBgClass(bgClass, isDay) {
  const classes = ['bg-clear','bg-cloudy','bg-rain','bg-snow','bg-storm','bg-fog','bg-overcast'];
  classes.forEach(c => appBody.classList.remove(c));
  appBody.classList.add(`bg-${bgClass}`);

  // Night mode: darken clear sky
  if (!isDay && bgClass === 'clear') {
    bgGradient.style.background = 'linear-gradient(135deg, #000510 0%, #050e2e 40%, #0a1a4a 100%)';
  } else {
    bgGradient.style.background = '';
  }

  // Spawn particles based on weather
  spawnParticles(bgClass);
}

// ── Particles ─────────────────────────────────────────────────
function spawnParticles(bgClass) {
  const container = document.getElementById('bg-particles');
  container.innerHTML = '';

  if (bgClass === 'rain' || bgClass === 'storm') {
    for (let i = 0; i < 60; i++) createRainDrop(container);
  } else if (bgClass === 'snow') {
    for (let i = 0; i < 40; i++) createSnowFlake(container);
  } else if (bgClass === 'clear') {
    for (let i = 0; i < 30; i++) createStar(container);
  }
}

function createRainDrop(container) {
  const drop = document.createElement('div');
  const x = Math.random() * 100;
  const delay = Math.random() * 2;
  const dur = 0.5 + Math.random() * 0.5;
  drop.style.cssText = `
    position:absolute; left:${x}%; top:-10px;
    width:1.5px; height:${12 + Math.random()*10}px;
    background:linear-gradient(transparent, rgba(147,197,253,0.6));
    border-radius:2px;
    animation: rainFall ${dur}s linear ${delay}s infinite;
    opacity:${0.4 + Math.random()*0.4};
  `;
  container.appendChild(drop);

  if (!document.getElementById('rain-keyframes')) {
    const style = document.createElement('style');
    style.id = 'rain-keyframes';
    style.textContent = `
      @keyframes rainFall { from { transform: translateY(-20px); } to { transform: translateY(105vh); } }
      @keyframes snowFall { 
        0%  { transform: translateY(-10px) translateX(0) rotate(0deg); }
        50% { transform: translateY(50vh) translateX(${(Math.random()-.5)*60}px) rotate(180deg); }
        100%{ transform: translateY(105vh) translateX(0) rotate(360deg); }
      }
      @keyframes starTwinkle {
        0%,100% { opacity: 0.3; transform: scale(1); }
        50%      { opacity: 1;   transform: scale(1.4); }
      }
    `;
    document.head.appendChild(style);
  }
}

function createSnowFlake(container) {
  const flake = document.createElement('div');
  const x = Math.random() * 100;
  const size = 4 + Math.random() * 8;
  const delay = Math.random() * 5;
  const dur = 4 + Math.random() * 4;
  flake.style.cssText = `
    position:absolute; left:${x}%; top:-10px;
    width:${size}px; height:${size}px;
    background:rgba(255,255,255,0.7);
    border-radius:50%;
    animation: snowFall ${dur}s ease-in-out ${delay}s infinite;
    opacity:${0.5 + Math.random()*0.5};
  `;
  container.appendChild(flake);
}

function createStar(container) {
  const star = document.createElement('div');
  const x = Math.random() * 100;
  const y = Math.random() * 60;
  const size = 1 + Math.random() * 2.5;
  const dur = 2 + Math.random() * 3;
  const delay = Math.random() * 3;
  star.style.cssText = `
    position:absolute; left:${x}%; top:${y}%;
    width:${size}px; height:${size}px;
    background:white; border-radius:50%;
    animation: starTwinkle ${dur}s ease-in-out ${delay}s infinite;
  `;
  container.appendChild(star);
}

// ── Helpers ───────────────────────────────────────────────────
function formatTime(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatHour(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDayName(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function getUVCategory(uv) {
  if (uv < 3)  return 'Low';
  if (uv < 6)  return 'Moderate';
  if (uv < 8)  return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

function getUVColor(uv) {
  if (!uv) return 'var(--text-muted)';
  if (uv < 3)  return 'var(--accent-green)';
  if (uv < 6)  return 'var(--accent-yellow)';
  if (uv < 8)  return 'var(--accent-orange)';
  return '#ef4444';
}
