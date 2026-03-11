import './LandingPage.css';

const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

const CITY_CARDS = [
  { id: 'tokyo',    label: 'TOKYO',    temp: '24°C', desc: 'Clear Skies • Humidity 45%', cls: 'card-tokyo' },
  { id: 'london',   label: 'LONDON',   temp: '15°C', desc: 'Light Rain • Humidity 82%', cls: 'card-london' },
  { id: 'new-york', label: 'NEW YORK', temp: '18°C', desc: 'Partly Cloudy • Wind 12mph', cls: 'card-newyork' },
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
    title: 'Live Storm Tracking',
    desc: 'Watch hurricanes and pressure systems evolve in real-time with fluid 3D animations.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    title: 'Glassmorphism UI',
    desc: 'A sleek, dark theme designed for modern high-resolution displays and mobile devices.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    title: 'Global Coverage',
    desc: 'Micro-climate data for every major city and remote location across all seven continents.',
  },
];

const REGIONS = [
  { name: 'Tokyo',    condition: 'Clear Sky', temp: '24°C', cls: 'region-tokyo' },
  { name: 'New York', condition: 'Cloudy',    temp: '18°C', cls: 'region-newyork' },
  { name: 'London',   condition: 'Raining',   temp: '15°C', cls: 'region-london' },
  { name: 'Dubai',    condition: 'Sunny',     temp: '38°C', cls: 'region-dubai' },
];

export default function LandingPage({ onExplore }) {
  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>Weather World</span>
        </div>
        <div className="landing-nav-links">
          <a href="#" onClick={e => { e.preventDefault(); onExplore(); }}>Globe</a>
          <a href="#">Forecast</a>
          <a href="#">Radar Maps</a>
          <a href="#">Climate Insights</a>
        </div>
        <div className="landing-nav-right">
          <div className="landing-nav-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Search city..." />
          </div>
          <button className="landing-signin-btn">Sign In</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          {/* Globe visual */}
          <div className="landing-globe-wrap">
            <div className="landing-globe-glow" />
            <div className="landing-globe-ring" />
            <img
              className="landing-globe-img"
              src={EARTH_TEXTURE}
              alt="Earth"
              draggable="false"
            />
          </div>

          {/* Floating city cards */}
          {CITY_CARDS.map(c => (
            <div key={c.id} className={`landing-city-card ${c.cls}`}>
              <div className="lcc-header">
                <span className="lcc-label">{c.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              </div>
              <div className="lcc-temp">{c.temp}</div>
              <div className="lcc-desc">{c.desc}</div>
            </div>
          ))}

          {/* Hero text */}
          <div className="landing-hero-text">
            <h1>
              Experience the World's<br />
              Weather in <span className="landing-3d">3D</span>
            </h1>
            <p>
              Precision real-time weather patterns, dynamic storm animations, and
              hyper-local insights powered by global satellite networks.
            </p>
            <div className="landing-hero-cta">
              <button className="landing-btn-primary" onClick={onExplore}>
                Explore the Globe
              </button>
              <button className="landing-btn-secondary">
                Watch Video Tour
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Advanced Forecasting ── */}
      <section className="landing-features">
        <div className="landing-section-inner">
          <h2>Advanced Forecasting</h2>
          <p className="landing-section-sub">
            Visualizing complex atmospheric data into stunning interactive experiences.
          </p>
          <div className="landing-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="landing-feature-card">
                <div className="lfc-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Regional Deep-Dive ── */}
      <section className="landing-regions">
        <div className="landing-section-inner">
          <h2>Regional Deep-Dive</h2>
          <div className="landing-regions-grid">
            {REGIONS.map(r => (
              <div key={r.name} className={`landing-region-card ${r.cls}`}>
                <div className="lrc-overlay" />
                <div className="lrc-name">{r.name}</div>
                <div className="lrc-bottom">
                  <span className="lrc-condition">{r.condition}</span>
                  <span className="lrc-temp">{r.temp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span>Weather<br />World</span>
          </div>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">API Access</a>
          <a href="#">Contact</a>
          <span className="landing-footer-copy">© 2024 Weather World. Satellite Imagery by GlobaNat.</span>
        </div>
      </footer>
    </div>
  );
}
