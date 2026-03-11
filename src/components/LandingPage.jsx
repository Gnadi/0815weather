import './LandingPage.css';

const CITY_CARDS = [
  {
    name: 'Tokyo',
    condition: 'Clear Sky',
    temp: '24°C',
    img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80',
  },
  {
    name: 'New York',
    condition: 'Cloudy',
    temp: '18°C',
    img: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=400&q=80',
  },
  {
    name: 'London',
    condition: 'Raining',
    temp: '15°C',
    img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80',
  },
  {
    name: 'Dubai',
    condition: 'Sunny',
    temp: '34°C',
    img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80',
  },
];

export default function LandingPage({ onExplore }) {
  return (
    <div className="landing">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-left">
          <svg className="landing-logo-icon" width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="1.5"/>
            <ellipse cx="12" cy="12" rx="4.5" ry="10" stroke="#3b82f6" strokeWidth="1.5"/>
            <line x1="2" y1="12" x2="22" y2="12" stroke="#3b82f6" strokeWidth="1.5"/>
            <path d="M4.5 7.5 Q12 9 19.5 7.5" stroke="#3b82f6" strokeWidth="1.2" fill="none"/>
            <path d="M4.5 16.5 Q12 15 19.5 16.5" stroke="#3b82f6" strokeWidth="1.2" fill="none"/>
          </svg>
          <span className="landing-logo-text">Weather World</span>
        </div>

        <div className="landing-nav-links">
          <a href="#" className="landing-nav-link" onClick={onExplore}>Globe</a>
          <a href="#" className="landing-nav-link">Forecast</a>
          <a href="#" className="landing-nav-link">Radar Maps</a>
          <a href="#" className="landing-nav-link">Climate Insights</a>
        </div>

        <div className="landing-nav-right">
          <div className="landing-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="landing-search-input" placeholder="Search city..." readOnly />
          </div>
          <button className="landing-signin">Sign In</button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="hero-globe-wrap">
          {/* Floating weather cards */}
          <div className="weather-card weather-card--tokyo">
            <div className="weather-card-city">TOKYO</div>
            <div className="weather-card-row">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="2" x2="12" y2="4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="20" x2="12" y2="22" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <line x1="2" y1="12" x2="4" y2="12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <line x1="20" y1="12" x2="22" y2="12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="weather-card-temp">24°C</span>
            </div>
            <div className="weather-card-sub">Clear Skies • Humidity 45%</div>
          </div>

          <div className="weather-card weather-card--newyork">
            <div className="weather-card-city">NEW YORK</div>
            <div className="weather-card-row">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
              </svg>
              <span className="weather-card-temp">18°C</span>
            </div>
            <div className="weather-card-sub">Partly Cloudy • Wind 12mph</div>
          </div>

          {/* Globe visual */}
          <div className="hero-globe" />
        </div>

        {/* Hero text */}
        <div className="hero-text">
          <h1 className="hero-title">
            Experience the World's<br />
            Weather in <span className="hero-accent">3D</span>
          </h1>
          <p className="hero-subtitle">
            Precision real-time weather patterns, dynamic storm animations, and<br />
            hyper-local insights powered by global satellite networks.
          </p>
          <div className="hero-ctas">
            <button className="btn-primary" onClick={onExplore}>Explore the Globe</button>
            <button className="btn-ghost">Watch Video Tour</button>
          </div>
        </div>
      </section>

      {/* ── Advanced Forecasting ──────────────────────────────── */}
      <section className="landing-features">
        <div className="features-inner">
          <h2 className="section-title">Advanced Forecasting</h2>
          <p className="section-sub">Visualizing complex atmospheric data into stunning interactive experiences.</p>
          <div className="feature-cards">
            {/* Live Storm Tracking */}
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                  <path d="M12 2a10 10 0 0 0-10 10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="10" strokeDasharray="2 4"/>
                </svg>
              </div>
              <h3 className="feature-title">Live Storm Tracking</h3>
              <p className="feature-desc">Watch hurricanes and pressure systems evolve in real-time with fluid 3D animations.</p>
            </div>

            {/* Glassmorphism UI */}
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/>
                  <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" fill="#3b82f6" stroke="none"/>
                  <path d="M5 15l.5 1.5L7 17l-1.5.5L5 19l-.5-1.5L3 17l1.5-.5z" fill="#3b82f6" stroke="none"/>
                </svg>
              </div>
              <h3 className="feature-title">Glassmorphism UI</h3>
              <p className="feature-desc">A sleek, dark theme designed for modern high-resolution displays and mobile devices.</p>
            </div>

            {/* Global Coverage */}
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <ellipse cx="12" cy="12" rx="4.5" ry="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                </svg>
              </div>
              <h3 className="feature-title">Global Coverage</h3>
              <p className="feature-desc">Micro-climate data for every major city and remote location across all seven continents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Regional Deep-Dive ────────────────────────────────── */}
      <section className="landing-regional">
        <div className="regional-inner">
          <h2 className="section-title">Regional Deep-Dive</h2>
          <div className="city-cards">
            {CITY_CARDS.map(city => (
              <div
                key={city.name}
                className="city-card"
                style={{ backgroundImage: `url(${city.img})` }}
              >
                <div className="city-card-overlay" />
                <div className="city-card-content">
                  <span className="city-card-name">{city.name}</span>
                  <div className="city-card-bottom">
                    <span className="city-card-condition">{city.condition}</span>
                    <span className="city-card-temp">{city.temp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <ellipse cx="12" cy="12" rx="4.5" ry="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <line x1="2" y1="12" x2="22" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            </svg>
            <span>Weather World</span>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">API Access</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
          <div className="footer-copy">© 2024 Weather World. Satellite Imagery by GlobaNet.</div>
        </div>
      </footer>
    </div>
  );
}
