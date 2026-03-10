import { useState, useEffect } from 'react';
import { fetchWeather } from '../utils/api';
import { getWeatherInfo, WeatherIcon } from '../utils/weatherCodes.jsx';

const GAME_CITIES = [
  { name: 'Tokyo',        country: 'Japan',          continent: 'Asia',          lat: 35.68,  lon: 139.69,  pop: 'Megacity (13M+)' },
  { name: 'Cairo',        country: 'Egypt',          continent: 'Africa',        lat: 30.06,  lon: 31.24,   pop: 'Megacity (20M+)' },
  { name: 'London',       country: 'UK',             continent: 'Europe',        lat: 51.51,  lon: -0.13,   pop: 'Megacity (9M+)'  },
  { name: 'New York',     country: 'United States',  continent: 'North America', lat: 40.71,  lon: -74.01,  pop: 'Megacity (8M+)'  },
  { name: 'Sydney',       country: 'Australia',      continent: 'Oceania',       lat: -33.87, lon: 151.21,  pop: 'Large city (5M+)' },
  { name: 'Reykjavik',    country: 'Iceland',        continent: 'Europe',        lat: 64.13,  lon: -21.94,  pop: 'Small city (130K)' },
  { name: 'Dubai',        country: 'UAE',            continent: 'Asia',          lat: 25.20,  lon: 55.27,   pop: 'Large city (3M+)' },
  { name: 'Beijing',      country: 'China',          continent: 'Asia',          lat: 39.90,  lon: 116.39,  pop: 'Megacity (21M+)' },
  { name: 'Buenos Aires', country: 'Argentina',      continent: 'South America', lat: -34.61, lon: -58.38,  pop: 'Megacity (15M+)' },
  { name: 'Lagos',        country: 'Nigeria',        continent: 'Africa',        lat: 6.52,   lon: 3.38,    pop: 'Megacity (14M+)' },
  { name: 'Mumbai',       country: 'India',          continent: 'Asia',          lat: 19.08,  lon: 72.88,   pop: 'Megacity (20M+)' },
  { name: 'Moscow',       country: 'Russia',         continent: 'Europe',        lat: 55.75,  lon: 37.62,   pop: 'Megacity (12M+)' },
  { name: 'Nairobi',      country: 'Kenya',          continent: 'Africa',        lat: -1.29,  lon: 36.82,   pop: 'Large city (4M+)' },
  { name: 'Toronto',      country: 'Canada',         continent: 'North America', lat: 43.65,  lon: -79.38,  pop: 'Large city (2.7M)' },
  { name: 'Bangkok',      country: 'Thailand',       continent: 'Asia',          lat: 13.75,  lon: 100.52,  pop: 'Megacity (10M+)' },
  { name: 'Cape Town',    country: 'South Africa',   continent: 'Africa',        lat: -33.92, lon: 18.42,   pop: 'Large city (4M+)' },
  { name: 'Anchorage',    country: 'United States',  continent: 'North America', lat: 61.22,  lon: -149.90, pop: 'Small city (290K)' },
  { name: 'Singapore',    country: 'Singapore',      continent: 'Asia',          lat: 1.35,   lon: 103.82,  pop: 'City-state (5.8M)' },
  { name: 'Helsinki',     country: 'Finland',        continent: 'Europe',        lat: 60.17,  lon: 24.94,   pop: 'Medium city (650K)' },
  { name: 'Lima',         country: 'Peru',           continent: 'South America', lat: -12.05, lon: -77.04,  pop: 'Megacity (10M+)' },
];

const TOTAL_ROUNDS = 3;
const BASE_SCORE   = 1000;
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const HINTS = [
  { key: 'continent', label: 'Continent',    cost: 100 },
  { key: 'country',   label: 'Country',      cost: 150 },
  { key: 'pop',       label: 'Population',   cost: 100 },
  { key: 'coords',    label: 'Hemisphere',   cost: 100 },
  { key: 'letter',    label: 'First Letter', cost: 150 },
];

function getHintValue(key, city) {
  switch (key) {
    case 'continent': return city.continent;
    case 'country':   return city.country;
    case 'pop':       return city.pop;
    case 'coords':    return `${city.lat >= 0 ? 'Northern' : 'Southern'} · ${city.lon >= 0 ? 'Eastern' : 'Western'} Hemisphere`;
    case 'letter':    return `Starts with "${city.name[0]}"`;
    default:          return '';
  }
}

function normalize(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GameMode({ onExit, onPlayAgain }) {
  const [queue]                   = useState(() => shuffle(GAME_CITIES).slice(0, TOTAL_ROUNDS));
  const [round, setRound]         = useState(0);
  const [weather, setWeather]     = useState(null);
  const [loadingW, setLoadingW]   = useState(true);
  const [status, setStatus]       = useState('guessing'); // guessing | correct | wrong | gameover
  const [guess, setGuess]         = useState('');
  const [hintsUsed, setHintsUsed] = useState([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [roundScore, setRoundScore] = useState(BASE_SCORE);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [newRecord, setNewRecord] = useState(false);
  const [highScore]               = useState(() => parseInt(localStorage.getItem('weather_game_highscore') ?? '0', 10));

  const city = queue[round];

  useEffect(() => {
    setLoadingW(true);
    setWeather(null);
    setStatus('guessing');
    setGuess('');
    setHintsUsed([]);
    setWrongCount(0);
    setRoundScore(BASE_SCORE);
    fetchWeather(city.lat, city.lon)
      .then(w => { setWeather(w); setLoadingW(false); })
      .catch(() => setLoadingW(false));
  }, [round]);

  function handleHint(hintKey) {
    if (hintsUsed.includes(hintKey) || status !== 'guessing') return;
    const cost = HINTS.find(h => h.key === hintKey).cost;
    setHintsUsed(prev => [...prev, hintKey]);
    setRoundScore(prev => Math.max(0, prev - cost));
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!guess.trim() || status !== 'guessing') return;
    if (normalize(guess) === normalize(city.name)) {
      setStatus('correct');
      const earned = roundScore;
      setRoundScores(prev => [...prev, earned]);
      setTotalScore(prev => {
        const next = prev + earned;
        if (next > parseInt(localStorage.getItem('weather_game_highscore') ?? '0', 10)) {
          setNewRecord(true);
          localStorage.setItem('weather_game_highscore', String(next));
        }
        return next;
      });
    } else {
      setWrongCount(w => w + 1);
      setRoundScore(prev => Math.max(0, prev - 50));
      setStatus('wrong');
      setTimeout(() => { setStatus('guessing'); setGuess(''); }, 700);
    }
  }

  function handleNext() {
    if (round + 1 >= TOTAL_ROUNDS) setStatus('gameover');
    else setRound(r => r + 1);
  }

  // ── Game over screen ──────────────────────────────────────────────
  if (status === 'gameover') {
    const best = Math.max(parseInt(localStorage.getItem('weather_game_highscore') ?? '0', 10), totalScore);
    return (
      <div className="weather-panel game-panel">
        <div className="game-over-screen">
          <div className="game-over-trophy">{newRecord ? '🏆' : '🎮'}</div>
          <div className="game-over-title">{newRecord ? 'New Record!' : 'Game Over'}</div>
          <div className="game-over-score">{totalScore} <span>pts</span></div>
          <div className="game-over-highscore">Best: {best} pts</div>

          <div className="game-rounds-breakdown">
            {roundScores.map((s, i) => (
              <div key={i} className="game-breakdown-row">
                <span className="game-breakdown-city">{queue[i].name}</span>
                <span className="game-breakdown-pts">{s} pts</span>
              </div>
            ))}
          </div>

          <div className="game-over-actions">
            <button className="game-btn-primary" onClick={onPlayAgain}>Play Again</button>
            <button className="game-btn-secondary" onClick={onExit}>Exit</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Round screen ──────────────────────────────────────────────────
  const cur      = weather?.current;
  const daily    = weather?.daily;
  const info     = cur ? getWeatherInfo(cur.weather_code) : null;
  const temp     = cur ? Math.round(cur.temperature_2m) : null;
  const allMaxes = daily?.temperature_2m_max ?? [];
  const allMins  = daily?.temperature_2m_min ?? [];
  const globalMax = allMaxes.length ? Math.max(...allMaxes) : 0;
  const globalMin = allMins.length  ? Math.min(...allMins)  : 0;

  return (
    <div className="weather-panel game-panel">

      {/* ── Top bar: round dots + score ── */}
      <div className="game-header">
        <div className="game-round-indicator">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <span key={i} className={`game-dot ${i < round ? 'done' : i === round ? 'active' : ''}`} />
          ))}
          <span className="game-round-label">Round {round + 1}/{TOTAL_ROUNDS}</span>
        </div>
        <div className="game-scores">
          <div className="game-score-item">
            <span className="game-score-label">Round</span>
            <span className="game-score-val">{roundScore}</span>
          </div>
          <div className="game-score-divider" />
          <div className="game-score-item">
            <span className="game-score-label">Total</span>
            <span className="game-score-val">{totalScore}</span>
          </div>
        </div>
      </div>

      {/* ── Mystery city placeholder ── */}
      <div className="panel-header">
        <div>
          <h2 className="panel-city game-mystery-name">??? Mystery City</h2>
          <p className="panel-country game-mystery-sub">Identify this city from its weather data</p>
        </div>
      </div>

      {/* ── Weather data (no city name) ── */}
      {loadingW ? (
        <div className="panel-loading"><div className="spinner" /><p>Loading clues…</p></div>
      ) : (
        <>
          {info && (
            <div className="panel-temp-row">
              <div>
                <div className="panel-temp">{temp}°C</div>
                <div className="panel-condition">{info.label.toUpperCase()}</div>
              </div>
              <div className="panel-icon"><WeatherIcon type={info.icon} size={72} /></div>
            </div>
          )}

          {cur && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Humidity</span>
                <span className="stat-value">{cur.relative_humidity_2m}%</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Wind</span>
                <span className="stat-value">{Math.round(cur.wind_speed_10m)} km/h</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Pressure</span>
                <span className="stat-value">{Math.round(cur.surface_pressure)} hPa</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Visibility</span>
                <span className="stat-value">{(cur.visibility / 1000).toFixed(1)} km</span>
              </div>
            </div>
          )}

          {daily && (
            <>
              <div className="forecast-header"><span>5-Day Forecast</span></div>
              <div className="forecast-list">
                {daily.time.map((t, i) => {
                  const d = new Date(t + 'T00:00:00Z');
                  const fc = getWeatherInfo(daily.weather_code[i]);
                  const hi = Math.round(allMaxes[i]);
                  const lo = Math.round(allMins[i]);
                  const range = globalMax - globalMin || 1;
                  const left  = ((lo - globalMin) / range) * 100;
                  const width = ((hi - lo) / range) * 100;
                  return (
                    <div key={i} className="forecast-row">
                      <span className="fc-day">{i === 0 ? 'TODAY' : DAYS[d.getUTCDay()]}</span>
                      <span className="fc-icon"><WeatherIcon type={fc.icon} size={22} /></span>
                      <div className="forecast-bar-bg">
                        <div className="forecast-bar-fill" style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }} />
                      </div>
                      <span className="fc-temps">{hi}° / {lo}°</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Hints ── */}
      <div className="game-hints-section">
        <div className="game-hints-title">HINTS</div>
        <div className="game-hints-list">
          {HINTS.map(h => {
            const used = hintsUsed.includes(h.key);
            return (
              <button
                key={h.key}
                className={`game-hint-btn ${used ? 'used' : ''}`}
                onClick={() => handleHint(h.key)}
                disabled={used || status !== 'guessing'}
              >
                <span className="hint-label-name">{h.label}</span>
                {used
                  ? <span className="hint-revealed">{getHintValue(h.key, city)}</span>
                  : <span className="hint-cost">−{h.cost} pts</span>
                }
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Guess input or correct result ── */}
      {status === 'correct' ? (
        <div className="game-result-card">
          <div className="game-result-check">✓</div>
          <div className="game-result-city">{city.name}</div>
          <div className="game-result-country">{city.country}</div>
          <div className="game-result-pts">+{roundScores[roundScores.length - 1]} pts</div>
          <button className="game-btn-primary" onClick={handleNext}>
            {round + 1 >= TOTAL_ROUNDS ? 'See Results' : 'Next Round →'}
          </button>
        </div>
      ) : (
        <form
          className={`game-guess-form ${status === 'wrong' ? 'shake' : ''}`}
          onSubmit={handleSubmit}
        >
          {wrongCount > 0 && (
            <div className="game-wrong-info">
              {wrongCount} wrong guess{wrongCount > 1 ? 'es' : ''} · −{wrongCount * 50} pts deducted
            </div>
          )}
          <div className="game-guess-row">
            <input
              className={`game-guess-input ${status === 'wrong' ? 'error' : ''}`}
              type="text"
              placeholder="Which city is this?"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              autoComplete="off"
              autoFocus
            />
            <button className="game-submit-btn" type="submit">GUESS</button>
          </div>
        </form>
      )}
    </div>
  );
}
