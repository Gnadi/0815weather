import { useState, useEffect, useRef } from 'react';
import { searchCities } from '../utils/api';

export default function SearchBar({ onCitySelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const cities = await searchCities(query);
      setResults(cities);
      setOpen(cities.length > 0);
    }, 300);
  }, [query]);

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(city) {
    setQuery('');
    setOpen(false);
    onCitySelect(city.latitude, city.longitude, city.name, city.country ?? '');
  }

  return (
    <div className="searchbar-wrap" ref={wrapRef}>
      <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        className="searchbar-input"
        type="text"
        placeholder="Search global cities..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && (
        <ul className="search-dropdown">
          {results.map((c, i) => (
            <li key={i} onMouseDown={() => select(c)}>
              <span className="search-city">{c.name}</span>
              <span className="search-country">{c.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
