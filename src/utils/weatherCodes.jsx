export const WMO_CODES = {
  0:  { label: 'Clear Sky',         icon: 'sun' },
  1:  { label: 'Mainly Clear',      icon: 'sun-cloud' },
  2:  { label: 'Partly Cloudy',     icon: 'sun-cloud' },
  3:  { label: 'Overcast',          icon: 'cloud' },
  45: { label: 'Fog',               icon: 'fog' },
  48: { label: 'Icy Fog',           icon: 'fog' },
  51: { label: 'Light Drizzle',     icon: 'drizzle' },
  53: { label: 'Drizzle',           icon: 'drizzle' },
  55: { label: 'Heavy Drizzle',     icon: 'rain' },
  56: { label: 'Freezing Drizzle',  icon: 'rain' },
  57: { label: 'Heavy Frz Drizzle', icon: 'rain' },
  61: { label: 'Light Rain',        icon: 'rain' },
  63: { label: 'Rain',              icon: 'rain' },
  65: { label: 'Heavy Rain',        icon: 'rain-heavy' },
  66: { label: 'Freezing Rain',     icon: 'rain' },
  67: { label: 'Heavy Frz Rain',    icon: 'rain-heavy' },
  71: { label: 'Light Snow',        icon: 'snow' },
  73: { label: 'Snow',              icon: 'snow' },
  75: { label: 'Heavy Snow',        icon: 'snow-heavy' },
  77: { label: 'Snow Grains',       icon: 'snow' },
  80: { label: 'Rain Showers',      icon: 'drizzle' },
  81: { label: 'Rain Showers',      icon: 'rain' },
  82: { label: 'Violent Showers',   icon: 'rain-heavy' },
  85: { label: 'Snow Showers',      icon: 'snow' },
  86: { label: 'Heavy Snow Showers',icon: 'snow-heavy' },
  95: { label: 'Thunderstorm',      icon: 'thunder' },
  96: { label: 'Thunderstorm',      icon: 'thunder' },
  99: { label: 'Thunderstorm',      icon: 'thunder' },
};

export function getWeatherInfo(code) {
  return WMO_CODES[code] ?? { label: 'Unknown', icon: 'cloud' };
}

export function WeatherIcon({ type, size = 48 }) {
  const s = size;
  const icons = {
    sun: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="10" fill="#FFD700" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const r = (deg * Math.PI) / 180;
          return <line key={i} x1={24+15*Math.cos(r)} y1={24+15*Math.sin(r)} x2={24+20*Math.cos(r)} y2={24+20*Math.sin(r)} stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />;
        })}
      </svg>
    ),
    'sun-cloud': (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <circle cx="16" cy="18" r="7" fill="#FFD700" opacity="0.9"/>
        <ellipse cx="26" cy="30" rx="12" ry="8" fill="#ccd6f6"/>
        <ellipse cx="18" cy="31" rx="8" ry="6" fill="#aab4d4"/>
      </svg>
    ),
    cloud: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="28" rx="16" ry="10" fill="#8899cc"/>
        <ellipse cx="18" cy="24" rx="9" ry="8" fill="#8899cc"/>
        <ellipse cx="30" cy="22" rx="11" ry="9" fill="#7788bb"/>
      </svg>
    ),
    fog: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <line x1="8" y1="18" x2="40" y2="18" stroke="#aabbdd" strokeWidth="3" strokeLinecap="round"/>
        <line x1="12" y1="24" x2="36" y2="24" stroke="#aabbdd" strokeWidth="3" strokeLinecap="round"/>
        <line x1="8" y1="30" x2="40" y2="30" stroke="#aabbdd" strokeWidth="3" strokeLinecap="round"/>
        <line x1="14" y1="36" x2="34" y2="36" stroke="#aabbdd" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
    drizzle: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="20" rx="14" ry="9" fill="#7788bb"/>
        <ellipse cx="16" cy="17" rx="9" ry="7" fill="#8899cc"/>
        {[14,22,30].map((x,i) => <line key={i} x1={x} y1="32" x2={x-3} y2="42" stroke="#60aaff" strokeWidth="2.5" strokeLinecap="round"/>)}
      </svg>
    ),
    rain: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="18" rx="14" ry="9" fill="#556699"/>
        <ellipse cx="16" cy="15" rx="9" ry="7" fill="#667aaa"/>
        {[12,20,28,36].map((x,i) => <line key={i} x1={x} y1="30" x2={x-4} y2="44" stroke="#4499ff" strokeWidth="2.5" strokeLinecap="round"/>)}
      </svg>
    ),
    'rain-heavy': (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="16" rx="15" ry="9" fill="#445588"/>
        <ellipse cx="15" cy="13" rx="9" ry="7" fill="#556699"/>
        {[10,18,26,34,16,28].map((x,i) => <line key={i} x1={x} y1={i<4?28:34} x2={x-5} y2={i<4?42:46} stroke="#3388ff" strokeWidth="2.5" strokeLinecap="round"/>)}
      </svg>
    ),
    snow: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="18" rx="14" ry="9" fill="#7788bb"/>
        <ellipse cx="16" cy="15" rx="9" ry="7" fill="#8899cc"/>
        {[14,22,30].map((x,i) => <text key={i} x={x-4} y="42" fill="#cceeff" fontSize="12" fontWeight="bold">❄</text>)}
      </svg>
    ),
    'snow-heavy': (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="16" rx="15" ry="9" fill="#556699"/>
        <ellipse cx="15" cy="13" rx="9" ry="7" fill="#667aaa"/>
        {[10,20,30,38].map((x,i) => <text key={i} x={x-4} y="42" fill="#ddeeff" fontSize="11" fontWeight="bold">❄</text>)}
      </svg>
    ),
    thunder: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="16" rx="15" ry="9" fill="#334466"/>
        <ellipse cx="15" cy="13" rx="9" ry="7" fill="#445577"/>
        <polygon points="26,28 20,38 25,38 19,48 33,33 27,33" fill="#FFD700"/>
      </svg>
    ),
  };
  return icons[type] ?? icons.cloud;
}
